/**
 * @fileoverview API Route for Updating Domain Configuration.
 * @description This is a backend (BE) Next.js API route designed for a specific, simple purpose:
 * adding a new member's email to a domain's member list in Firestore.
 *
 * It is called when a new user signs up. The route finds the specified domain document
 * in Firestore and adds the user's email to the `members` array.
 *
 * Note: This route appears to be partially redundant, as the more comprehensive
 * `/api/update-permissions` route handles most permission-related tasks. This might be a
 * candidate for future refactoring or consolidation.
 *
 * Linked Files:
 * - `src/lib/firebase.ts`: Imports the Firestore database instance (`db`).
 * - Potentially called from a user sign-up flow, although the direct link is not present
 *   in the current file list. `src/components/login-form.tsx` is the most likely caller.
 *
 * Tech Used:
 * - Next.js API Routes: The API framework.
 * - Firebase Firestore: The database for domain configurations.
 */
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
    try {
        const { domain, email } = await req.json();

        if (!domain || !email) {
            return NextResponse.json({ error: 'Domain and email are required.' }, { status: 400 });
        }

        const domainRef = doc(db, 'domains', domain);
        const domainSnap = await getDoc(domainRef);

        if (!domainSnap.exists()) {
             return NextResponse.json({ error: `Domain "${domain}" not found.` }, { status: 404 });
        }

        const domainData = domainSnap.data();

        if ((domainData.members || []).includes(email) || (domainData.leads || []).includes(email)) {
             return NextResponse.json({ error: 'This email already exists in the domain.'}, { status: 409 });
        }

        await updateDoc(domainRef, {
            members: arrayUnion(email)
        });
        
        return NextResponse.json({ message: 'Domain config updated successfully.' }, { status: 200 });

    } catch (error) {
        console.error('Error updating domain config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
