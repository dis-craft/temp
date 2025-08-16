/**
 * @fileoverview API Route for Announcements CRUD Operations.
 * @description This is a backend (BE) Next.js API route that handles all Create, Read, Update,
 * and Delete (CRUD) operations for announcements. It uses Firebase Firestore as its database.
 * 
 * - `POST`: Creates a new announcement. It performs a permission check to ensure the user
 *   (super-admin, admin, or domain-lead) is authorized to create announcements.
 * - `PUT`: Updates an existing announcement. It verifies that the user has permission to
 *   edit the specific announcement (either a high-level admin or the original author).
 * - `DELETE`: Deletes an announcement. It performs similar permission checks as the PUT endpoint.
 *
 * This route is responsible for the core business logic of the announcements feature, including
 * permission management and interaction with the Firestore database. It also logs all
*  significant actions using the `logActivity` service.
 *
 * Linked Files:
 * - `src/lib/firebase.ts`: Imports the Firestore database instance (`db`).
 * - `src/lib/logger.ts`: Imports the `logActivity` function for auditing.
 * - `src/lib/types.ts`: Imports type definitions for `User` and `Announcement`.
 * - `src/app/dashboard/announcements/page.tsx`: The frontend page that calls this API to manage announcements.
 *
 * Tech Used:
 * - Next.js API Routes: The framework for building the API endpoint.
 * - Firebase Firestore: The NoSQL database for storing announcement data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/logger';
import { headers } from 'next/headers';
import type { User, Announcement } from '@/lib/types';


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

async function canUserManage(user: User | null, announcement?: Announcement): Promise<boolean> {
    if (!user) return false;
    if (user.role === 'super-admin' || user.role === 'admin') return true;
    if (user.role === 'domain-lead') {
        if (!announcement) return true; // Can create
        // Can only manage announcements they created
        return announcement.author.id === user.id;
    }
    return false;
}

// POST: Create an announcement
export async function POST(req: NextRequest) {
    const user = await getUserFromHeaders();
    if (!(await canUserManage(user))) {
        return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    try {
        const body = await req.json();
        
        const newAnnouncement: Omit<Announcement, 'id'> = {
            ...body,
            author: user,
            createdAt: new Date().toISOString(),
            publishAt: new Date().toISOString(), // Publish immediately
        };

        const docRef = await addDoc(collection(db, 'announcements'), newAnnouncement);
        await logActivity(`Created announcement: "${newAnnouncement.title}"`, 'Announcements', user);
        return NextResponse.json({ ...newAnnouncement, id: docRef.id }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating announcement:', error);
        await logActivity(`Error creating announcement: ${error.message}`, 'Error', user);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// PUT: Update an announcement
export async function PUT(req: NextRequest) {
    const user = await getUserFromHeaders();
    if (!(await canUserManage(user))) {
        return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }
    
    try {
        const { id, ...updates } = await req.json();
        if (!id) {
            return NextResponse.json({ error: 'ID is required.' }, { status: 400 });
        }

        const annRef = doc(db, 'announcements', id);
        const annDoc = await getDoc(annRef);

        if (!annDoc.exists()) {
             return NextResponse.json({ error: 'Announcement not found.' }, { status: 404 });
        }
        
        if (!(await canUserManage(user, annDoc.data() as Announcement))) {
             return NextResponse.json({ error: 'You do not have permission to edit this announcement.' }, { status: 403 });
        }

        await updateDoc(annRef, updates);

        await logActivity(`Updated announcement: "${updates.title || annDoc.data()?.title}" (ID: ${id})`, 'Announcements', user);
        return NextResponse.json({ message: 'Announcement updated successfully.' }, { status: 200 });

    } catch (error: any) {
        console.error('Error updating announcement:', error);
        await logActivity(`Error updating announcement: ${error.message}`, 'Error', user);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// DELETE: Delete an announcement
export async function DELETE(req: NextRequest) {
     const user = await getUserFromHeaders();
    if (!(await canUserManage(user))) {
        return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required.' }, { status: 400 });
    }

    try {
        const annRef = doc(db, 'announcements', id);
        const annDoc = await getDoc(annRef);
        if (!annDoc.exists()) {
             return NextResponse.json({ error: 'Announcement not found.' }, { status: 404 });
        }
        if (!(await canUserManage(user, annDoc.data() as Announcement))) {
             return NextResponse.json({ error: 'You do not have permission to delete this announcement.' }, { status: 403 });
        }

        await deleteDoc(annRef);
        await logActivity(`Deleted announcement (ID: ${id})`, 'Announcements', user);
        return NextResponse.json({ message: 'Announcement deleted successfully.' }, { status: 200 });

    } catch (error: any) {
        console.error('Error deleting announcement:', error);
        await logActivity(`Error deleting announcement: ${error.message}`, 'Error', user);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
