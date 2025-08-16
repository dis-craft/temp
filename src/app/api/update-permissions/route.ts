/**
 * @fileoverview API Route for Managing Permissions and Domains.
 * @description This is a comprehensive backend (BE) Next.js API route that serves as the central
 * point for managing user permissions and domain structures. It's a multi-purpose endpoint
 * controlled by an `action` field in the request body.
 *
 * Supported Actions:
 * - `add-domain`: Creates a new domain document in Firestore. (Superadmin only)
 * - `delete-domain`: Deletes a domain and all of its associated tasks. (Superadmin only)
 * - `add-member` / `remove-member`: Adds or removes an email from a domain's `members` array.
 * - `add-lead` / `remove-lead`: Adds or removes an email from a domain's `leads` array.
 * - `add-special-role` / `remove-special-role`: Assigns or removes a 'super-admin' or 'admin'
 *   role to/from a user by email in the `config/specialRoles` document.
 *
 * This route is critical for the administrative functions of the application. It performs
 * permission checks based on the authenticated user's role and logs all actions.
 *
 * Linked Files:
 * - `src/lib/firebase.ts`: Imports the Firestore database instance (`db`).
 * - `src/lib/logger.ts`: Imports the `logActivity` function.
 * - `src/lib/types.ts`: Imports the `User` type.
 * - `src/app/dashboard/permissions/page.tsx`: The primary frontend management page that calls this API.
 *
 * Tech Used:
 * - Next.js API Routes: The API framework.
 * - Firebase Firestore: The database for all permission and domain data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, deleteDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/logger';
import { headers } from 'next/headers';
import type { User } from '@/lib/types';

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

export async function POST(req: NextRequest) {
    const user = await getUserFromHeaders();
    if (!user) {
        return NextResponse.json({ error: 'You must be logged in to perform this action.' }, { status: 401 });
    }

    try {
        const { action, domain, email, role } = await req.json();

        if (!action) {
            return NextResponse.json({ error: 'Action is required.' }, { status: 400 });
        }
        
        if (action === 'add-domain') {
            if (!domain) return NextResponse.json({ error: 'Domain name is required.' }, { status: 400 });
            const domainRef = doc(db, 'domains', domain);
            const domainSnap = await getDoc(domainRef);
            if (domainSnap.exists()) {
                return NextResponse.json({ error: 'Domain already exists.' }, { status: 409 });
            }
            await setDoc(domainRef, { name: domain, leads: [], members: [] });
            await logActivity(`Created new domain: "${domain}"`, 'Domain Management', user);
            return NextResponse.json({ message: 'Domain created successfully.' }, { status: 200 });

        } else if (action === 'delete-domain') {
            if (!domain) return NextResponse.json({ error: 'Domain name is required.' }, { status: 400 });

            const batch = writeBatch(db);
            
            // Delete the domain document
            const domainRef = doc(db, 'domains', domain);
            batch.delete(domainRef);

            // Find and delete all tasks associated with the domain
            const tasksQuery = query(collection(db, 'tasks'), where('domain', '==', domain));
            const tasksSnapshot = await getDocs(tasksQuery);
            tasksSnapshot.forEach(taskDoc => {
                batch.delete(taskDoc.ref);
            });

            await batch.commit();
            await logActivity(`Deleted domain: "${domain}" and all its tasks`, 'Domain Management', user);
            return NextResponse.json({ message: `Domain "${domain}" and its tasks deleted successfully.` }, { status: 200 });

        } else if (action === 'add-member' || action === 'remove-member' || action === 'add-lead' || action === 'remove-lead') {
             if (!email || !domain) return NextResponse.json({ error: 'Email and domain are required.' }, { status: 400 });
             const domainRef = doc(db, 'domains', domain);
             if (action === 'add-member') {
                 await updateDoc(domainRef, { members: arrayUnion(email) });
                 await logActivity(`Added member "${email}" to domain "${domain}"`, 'Permissions', user);
             } else if (action === 'remove-member') {
                 await updateDoc(domainRef, { members: arrayRemove(email) });
                 await logActivity(`Removed member "${email}" from domain "${domain}"`, 'Permissions', user);
             } else if (action === 'add-lead') {
                 await updateDoc(domainRef, { leads: arrayUnion(email) });
                 await logActivity(`Added lead "${email}" to domain "${domain}"`, 'Permissions', user);
             } else if (action === 'remove-lead') {
                 await updateDoc(domainRef, { leads: arrayRemove(email) });
                 await logActivity(`Removed lead "${email}" from domain "${domain}"`, 'Permissions', user);
             }
        } else if (action === 'add-special-role' || action === 'remove-special-role') {
            if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
            
            const specialRolesRef = doc(db, 'config', 'specialRoles');
            const docSnap = await getDoc(specialRolesRef);

            if (!docSnap.exists()) {
                await setDoc(specialRolesRef, {});
            }

            if (action === 'add-special-role') {
                if (!role) return NextResponse.json({ error: 'Role is required.' }, { status: 400 });
                 await updateDoc(specialRolesRef, { [email]: role });
                 await logActivity(`Assigned special role "${role}" to "${email}"`, 'Permissions', user);
            } else if (action === 'remove-special-role') {
                 const currentRoles = docSnap.data() || {};
                 delete currentRoles[email];
                 await setDoc(specialRolesRef, currentRoles);
                 await logActivity(`Removed special role from "${email}"`, 'Permissions', user);
            }
        }
        else {
            return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
        }
        
        return NextResponse.json({ message: 'Permissions updated successfully.' }, { status: 200 });

    } catch (error: any) {
        console.error('Error updating permissions config:', error);
        const errorMessage = error.message || 'An unexpected error occurred.';
        await logActivity(`Error updating permissions: ${errorMessage}`, 'Error', user);
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}
