/**
 * @fileoverview API Route for Updating User Profile Information.
 * @description This is a backend (BE) Next.js API route that handles updating a user's
 * profile data, specifically their name and avatar URL.
 *
 * It is a secure endpoint that first verifies the authenticated user from the request headers.
 * It then updates the user's data in two separate Firebase services to ensure consistency:
 * 1.  **Firebase Authentication**: Updates the user's `displayName` and `photoURL` in the core
 *     authentication record using the Firebase Admin SDK.
 * 2.  **Firestore**: Updates the `name` and `avatarUrl` fields in the user's corresponding
 *     document in the `users` collection.
 *
 * This two-step update ensures that the user's profile information is consistent across
 * the different parts of Firebase used by the application.
 *
 * Linked Files:
 * - `src/lib/firebase-admin.ts`: Imports the initialized Firebase Admin app.
 * - `src/components/dashboard/profile-settings-modal.tsx`: The frontend modal that calls this API.
 * - `.env`: Requires Firebase Admin SDK credentials to be set up.
 *
 * Tech Used:
 * - Next.js API Routes: The API framework.
 * - Firebase Admin SDK: For updating user records in Firebase Authentication and Firestore.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';

// Helper to get user from custom header
async function getUserIdFromHeaders(req: NextRequest): Promise<string | null> {
    const userStr = req.headers.get('x-user-id');
    return userStr || null;
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getUserIdFromHeaders(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: No user ID provided.' }, { status: 401 });
        }

        const { name, avatarUrl, phoneNumber } = await req.json();

        if (!name && !avatarUrl && phoneNumber === undefined) {
            return NextResponse.json({ error: 'No update data provided.' }, { status: 400 });
        }
        
        const auth = getAuth(adminApp);
        const db = getFirestore(adminApp);
        
        // Prepare updates for Firebase Auth and Firestore
        const authUpdates: { displayName?: string; photoURL?: string } = {};
        if (name) authUpdates.displayName = name;
        if (avatarUrl) authUpdates.photoURL = avatarUrl;
        
        const firestoreUpdates: { name?: string; avatarUrl?: string; phoneNumber?: string } = {};
        if (name) firestoreUpdates.name = name;
        if (avatarUrl) firestoreUpdates.avatarUrl = avatarUrl;
        if (phoneNumber !== undefined) firestoreUpdates.phoneNumber = phoneNumber;


        // --- Perform Updates ---
        
        // 1. Update Firebase Authentication user record
        if (Object.keys(authUpdates).length > 0) {
            await auth.updateUser(userId, authUpdates);
        }
        
        // 2. Update Firestore user document
        if (Object.keys(firestoreUpdates).length > 0) {
            const userDocRef = db.collection('users').doc(userId);
            await userDocRef.update(firestoreUpdates);
        }

        return NextResponse.json({ message: 'Profile updated successfully.' }, { status: 200 });

    } catch (error: any) {
        console.error('Error updating profile:', error);
        // Provide a more specific error message if available
        const errorMessage = error.message || 'An unexpected error occurred.';
        const errorCode = error.code || 'internal_error';

        return NextResponse.json({ error: `Failed to update profile: ${errorMessage}`, code: errorCode }, { status: 500 });
    }
}
