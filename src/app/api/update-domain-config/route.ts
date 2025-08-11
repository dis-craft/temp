
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
