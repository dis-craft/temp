
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Announcement, AnnouncementTarget } from '@/lib/types';


async function getTargetUsers(targets: AnnouncementTarget[]): Promise<User[]> {
    if (targets.includes('all')) {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        return usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    }

    const allTargetUsers: Record<string, User> = {};

    for (const target of targets) {
        const [type, value] = target.split('-');
        let q;
        if (type === 'role') {
            q = query(collection(db, 'users'), where('role', '==', value));
        } else if (type === 'domain') {
            q = query(collection(db, 'users'), where('domain', '==', value));
        }

        if (q) {
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => {
                allTargetUsers[doc.id] = { id: doc.id, ...doc.data() } as User;
            });
        }
    }
    
    return Object.values(allTargetUsers);
}

export async function POST(req: NextRequest) {
    const { announcement }: { announcement: Announcement } = await req.json();

    if (!announcement) {
        return NextResponse.json({ error: 'Announcement data is required.' }, { status: 400 });
    }
    
    // In a real app, this would be a scheduled task checking for announcements to be published.
    // For this project, we trigger it on publish/update if the time is right.
    if (new Date(announcement.publishAt) > new Date() || announcement.status !== 'published') {
        return NextResponse.json({ message: 'Announcement is not ready for delivery.' }, { status: 200 });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    try {
        const targetUsers = await getTargetUsers(announcement.targets);
        const emailList = targetUsers.map(u => u.email).filter(Boolean);

        if (emailList.length === 0) {
            return NextResponse.json({ message: 'No recipients found for this announcement.' }, { status: 200 });
        }
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vyomsetuclub.vercel.app';

        const mailOptions = {
            from: `"vyomsetu-club" <${process.env.GMAIL_USER}>`,
            to: emailList.join(','),
            subject: `Announcement: ${announcement.title}`,
            html: `
                <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #333; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                        <h1 style="color: #2962FF; font-size: 24px; border-bottom: 2px solid #eee; padding-bottom: 10px;">${announcement.title}</h1>
                        <p style="font-size: 12px; color: #555;">Posted by ${announcement.author.name} on ${new Date(announcement.publishAt).toLocaleDateString()}</p>
                        <div style="font-size: 16px; margin: 20px 0;">
                            ${announcement.content.replace(/\n/g, '<br/>')}
                        </div>
                        <p style="font-size: 16px; text-align: center;">
                            <a href="${appUrl}/dashboard/announcements" style="background-color: #2962FF; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">View on Platform</a>
                        </p>
                    </div>
                </div>
            `,
        };
        
        await transporter.sendMail(mailOptions);
        
        // Mark as sent to prevent re-sending
        if (announcement.id) {
             const annRef = doc(db, 'announcements', announcement.id);
             await updateDoc(annRef, { sent: true });
        }

        return NextResponse.json({ message: 'Announcement email sent successfully!' }, { status: 200 });
    } catch (error) {
        console.error('Error sending announcement email:', error);
        return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
    }
}
