
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, deleteField, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
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
        } else if (action === 'add-member' || action === 'remove-member' || action === 'add-lead' || action === 'remove-lead') {
             if (!email || !domain) return NextResponse.json({ error: 'Email and domain are required.' }, { status: 400 });
             const domainRef = doc(db, 'domains', domain);
             if (action === 'add-member') {
                 await updateDoc(domainRef, { members: arrayUnion(email) });
             } else if (action === 'remove-member') {
                 await updateDoc(domainRef, { members: arrayRemove(email) });
             } else if (action === 'add-lead') {
                 await updateDoc(domainRef, { leads: arrayUnion(email) });
             } else if (action === 'remove-lead') {
                 await updateDoc(domainRef, { leads: arrayRemove(email) });
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
            } else if (action === 'remove-special-role') {
                 await updateDoc(specialRolesRef, { [email]: deleteField() });
            }
        }
        else {
            return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
        }
        
        return NextResponse.json({ message: 'Permissions updated successfully.' }, { status: 200 });

    } catch (error: any) {
        console.error('Error updating permissions config:', error);
        const errorMessage = error.message || 'An unexpected error occurred.';
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}
