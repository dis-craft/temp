
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/logger';
import { headers } from 'next/headers';
import type { User, DocumentationFile, DocumentationFolder, DocumentationItem } from '@/lib/types';
import { s3Client } from '@/lib/r2';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

async function getUserFromHeaders(): Promise<User | null> {
    const headersList = headers();
    const userStr = headersList.get('x-user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    }
    return null;
}

function canUserView(item: DocumentationItem, user: User): boolean {
    if (!item.viewableBy || item.viewableBy.length === 0) {
        // for backward compatibility, if viewableBy is not set, allow all
        return true;
    }
    if (user.role === 'super-admin' || user.role === 'admin') return true;

    const userRoles = [
        user.role, 
        user.domain ? `${user.domain}-${user.role}` : null
    ].filter(Boolean);

    return item.viewableBy.some(role => userRoles.includes(role as string));
}

async function hasPermission(user: User | null): Promise<boolean> {
    if (!user) return false;
    return user.role === 'super-admin' || user.role === 'admin' || (user.role === 'domain-lead' && user.domain === 'Documentation');
}

// POST: Create a folder or a file
export async function POST(req: NextRequest) {
    const user = await getUserFromHeaders();
    if (!(await hasPermission(user))) {
        return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { type, name, parentId, filePath, mimeType, viewableBy } = body;

        if (type === 'folder') {
            const newFolder: Omit<DocumentationFolder, 'id'> = {
                name,
                parentId,
                type: 'folder',
                createdAt: new Date().toISOString(),
                createdBy: user!,
                viewableBy: viewableBy || [],
            };
            const docRef = await addDoc(collection(db, 'documentation'), newFolder);
            await logActivity(`Created documentation folder: "${name}"`, 'Documentation', user);
            return NextResponse.json({ ...newFolder, id: docRef.id }, { status: 201 });

        } else if (type === 'file') {
            const newFile: Omit<DocumentationFile, 'id'> = {
                name,
                parentId,
                type: 'file',
                filePath,
                mimeType,
                createdAt: new Date().toISOString(),
                createdBy: user!,
                viewableBy: viewableBy || [],
            };
            const docRef = await addDoc(collection(db, 'documentation'), newFile);
            await logActivity(`Uploaded documentation file: "${name}"`, 'Documentation', user);
            return NextResponse.json({ ...newFile, id: docRef.id }, { status: 201 });

        } else {
            return NextResponse.json({ error: 'Invalid type specified.' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Error creating documentation item:', error);
        await logActivity(`Error creating documentation item: ${error.message}`, 'Error', user);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET: Fetch all documentation items
export async function GET(req: NextRequest) {
     const user = await getUserFromHeaders();
     if (!user) {
         return NextResponse.json({ error: 'You must be logged in to view documentation.' }, { status: 401 });
     }

    try {
        const q = query(collection(db, 'documentation'));
        const querySnapshot = await getDocs(q);
        const allItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as DocumentationItem }));

        // Filter items based on user's role and permissions
        const visibleItems = allItems.filter(item => canUserView(item, user));
        
        return NextResponse.json(visibleItems, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching documentation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT: Rename a folder or file, or update its permissions
export async function PUT(req: NextRequest) {
    const user = await getUserFromHeaders();
    if (!(await hasPermission(user))) {
        return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    try {
        const { id, name, viewableBy, type } = await req.json();
        if (!id) {
            return NextResponse.json({ error: 'ID is required.' }, { status: 400 });
        }

        const itemRef = doc(db, 'documentation', id);
        const updates: Partial<DocumentationItem> = {};

        if (name) {
            updates.name = name;
        }
        if (viewableBy) {
            updates.viewableBy = viewableBy;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No update data provided.' }, { status: 400 });
        }
        
        await updateDoc(itemRef, updates);

        if (name) {
            await logActivity(`Renamed documentation ${type}: "${name}" (ID: ${id})`, 'Documentation', user);
        }
        if (viewableBy) {
             await logActivity(`Updated permissions for documentation item (ID: ${id})`, 'Documentation', user);
        }

        return NextResponse.json({ message: 'Item updated successfully.' }, { status: 200 });
    } catch (error: any) {
        console.error('Error updating item:', error);
        await logActivity(`Error updating documentation item: ${error.message}`, 'Error', user);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// DELETE: Delete a file or a folder (and all its contents)
export async function DELETE(req: NextRequest) {
    const user = await getUserFromHeaders();
    if (!(await hasPermission(user))) {
        return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
        return NextResponse.json({ error: 'ID and type are required.' }, { status: 400 });
    }

    const batch = writeBatch(db);

    try {
        if (type === 'file') {
            const itemRef = doc(db, 'documentation', id);
            const itemDoc = await getDoc(itemRef);
            const itemData = itemDoc.data() as DocumentationFile | undefined;
            
            if (itemData?.filePath) {
                // Delete from R2
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: itemData.filePath,
                }));
            }
            batch.delete(itemRef);
            await logActivity(`Deleted documentation file (ID: ${id})`, 'Documentation', user);

        } else if (type === 'folder') {
            // Recursively delete folder contents
            await deleteFolderAndContents(id, batch, user);
            await logActivity(`Deleted documentation folder and its contents (ID: ${id})`, 'Documentation', user);
        }

        await batch.commit();
        return NextResponse.json({ message: 'Item(s) deleted successfully.' }, { status: 200 });

    } catch (error: any) {
        console.error('Error deleting item(s):', error);
        await logActivity(`Error deleting documentation item: ${error.message}`, 'Error', user);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function deleteFolderAndContents(folderId: string, batch: any, user: User | null) {
    // Delete the folder itself
    const folderRef = doc(db, 'documentation', folderId);
    batch.delete(folderRef);

    // Find and delete direct children files
    const filesQuery = query(collection(db, 'documentation'), where('parentId', '==', folderId), where('type', '==', 'file'));
    const filesSnapshot = await getDocs(filesQuery);
    for (const fileDoc of filesSnapshot.docs) {
        const fileData = fileDoc.data() as DocumentationFile;
        if (fileData.filePath) {
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: fileData.filePath,
                }));
            } catch (r2Error) {
                console.error(`Failed to delete file ${fileData.filePath} from R2:`, r2Error);
                // Continue to delete Firestore record even if R2 fails
            }
        }
        batch.delete(fileDoc.ref);
    }

    // Find and recursively delete sub-folders
    const subFoldersQuery = query(collection(db, 'documentation'), where('parentId', '==', folderId), where('type', '==', 'folder'));
    const subFoldersSnapshot = await getDocs(subFoldersQuery);
    for (const subFolderDoc of subFoldersSnapshot.docs) {
        await deleteFolderAndContents(subFolderDoc.id, batch, user);
    }
}
