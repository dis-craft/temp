/**
 * @fileoverview API Route for Sending Announcement Emails.
 * @description This is a backend (BE) Next.js API route responsible for sending email
 * notifications for new or updated announcements.
 *
 * It receives announcement data in a POST request. The `getTargetUsers` function determines
 * the recipient list by fetching all users from Firestore and filtering them based on the
 * announcement's `targets` (e.g., role, domain).
 *
 * It then constructs an HTML email using the Nodemailer library and sends it via the configured
 * Gmail SMTP server. The email includes the announcement title, content, author, and a link to
 * an attachment if one exists.
 *
 * After successfully sending the email, it updates the announcement document in Firestore
 * to mark it as `sent: true` to prevent duplicate notifications.
 *
 * Linked Files:
 * - `src/lib/firebase.ts`: Imports the Firestore database instance (`db`).
 * - `src/lib/types.ts`: Imports type definitions for `User`, `Announcement`, etc.
 * - `.env`: Requires `GMAIL_USER` and `GMAIL_APP_PASSWORD` to be set for Nodemailer.
 * - `src/app/dashboard/announcements/page.tsx`: The frontend page that calls this API.
 *
 * Tech Used:
 * - Next.js API Routes: The API framework.
 * - Nodemailer: The library used to send emails via SMTP.
 * - Firebase Firestore: To fetch user data and update announcement status.
 */
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Announcement, AnnouncementTarget } from '@/lib/types';


async function getTargetUsers(targets: AnnouncementTarget[]): Promise<User[]> {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    const allUserEmails = new Set(allUsers.map(u => u.email).filter(Boolean));

    if (targets.includes('all')) {
        return allUsers;
    }

    const targetedEmails = new Set<string>();

    for (const target of targets) {
        if (target.includes('@')) { // Handle individual email targets
            targetedEmails.add(target);
        }
        else if (target.startsWith('role-')) {
            const role = target.substring('role-'.length);
            if (role === 'domain-lead') {
                // Special handling for domain leads: get them from the domains collection
                const domainsSnapshot = await getDocs(collection(db, 'domains'));
                domainsSnapshot.forEach(domainDoc => {
                    const leads = domainDoc.data().leads || [];
                    leads.forEach((leadEmail: string) => targetedEmails.add(leadEmail));
                });
            } else {
                allUsers.forEach(user => {
                    if (user.role === role) {
                        targetedEmails.add(user.email!);
                    }
                });
            }
        } else if (target.startsWith('domain-')) {
            const domain = target.substring('domain-'.length);
            allUsers.forEach(user => {
                if (user.domains?.includes(domain)) {
                    targetedEmails.add(user.email!);
                }
            });
        }
    }
    
    // Convert the set of emails back to a list of User objects
    return allUsers.filter(user => user.email && targetedEmails.has(user.email));
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
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vyomsetu-club.vercel.app';

        let attachmentLink = '';
        if (announcement.attachment) {
            const downloadUrl = `${appUrl}/api/download/${announcement.attachment}`;
            attachmentLink = `
                <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>Attachment:</strong> <a href="${downloadUrl}" style="color: #007bff; text-decoration: none;" target="_blank" rel="noopener noreferrer">Download Attached File</a>
                </p>
            `;
        }

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
                        ${attachmentLink}
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
