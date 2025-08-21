/**
 * @fileoverview API Route for Sending Suggestion-Related Emails.
 * @description This is a backend (BE) Next.js API route that handles sending emails for the
 * Suggestions & Feedback feature. It supports two types of notifications.
 *
 * The POST handler uses a `type` field in the request body to differentiate between:
 * - `new-suggestion`: Notifies all admins and the relevant domain lead (if any) that a new
 *   suggestion has been submitted.
 * - `new-response`: Notifies the original submitter (if not anonymous) that an admin or
 *   lead has posted a response to their suggestion.
 *
 * It uses Nodemailer and the configured Gmail SMTP server to send formatted HTML emails.
 *
 * Linked Files:
 * - `.env`: Requires `GMAIL_USER` and `GMAIL_APP_PASSWORD`.
 * - `src/lib/types.ts`: Imports type definitions for `Suggestion` and `User`.
 * - `src/app/dashboard/suggestions/page.tsx`: The frontend page that calls this API.
 *
 * Tech Used:
 * - Next.js API Routes: The API framework.
 * - Nodemailer: For sending emails.
 */
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import type { Suggestion, User } from '@/lib/types';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vyomsetu-club.vercel.app';

const sendNewSuggestionEmail = async (suggestion: Suggestion, allUsers: User[]) => {
    const admins = allUsers.filter(u => u.role === 'super-admin' || u.role === 'admin').map(u => u.email).filter(Boolean);
    const domainLead = allUsers.find(u => u.role === 'domain-lead' && u.domain === suggestion.domain)?.email;

    const toList = [...new Set([...admins, domainLead].filter(Boolean as (s: string | null) => s is string))];
    
    if (toList.length === 0) return;

    const mailOptions = {
        from: `"vyomsetu-club" <${process.env.GMAIL_USER}>`,
        to: toList.join(','),
        subject: `[New Suggestion] ${suggestion.priority}: ${suggestion.title}`,
        html: `
            <h1>New Suggestion Submitted</h1>
            <p>A new suggestion has been submitted on the platform.</p>
            <ul>
                <li><strong>Title:</strong> ${suggestion.title}</li>
                <li><strong>Submitter:</strong> ${suggestion.isAnonymous ? 'Anonymous' : suggestion.submitter.name}</li>
                <li><strong>Category:</strong> ${suggestion.category}</li>
                <li><strong>Priority:</strong> ${suggestion.priority}</li>
            </ul>
            <p><strong>Description:</strong></p>
            <p>${suggestion.description}</p>
            <a href="${appUrl}/dashboard/suggestions">View Suggestion</a>
        `,
    };
    await transporter.sendMail(mailOptions);
};

const sendNewResponseEmail = async (suggestion: Suggestion, responder: User) => {
    const submitterEmail = suggestion.submitter.email;
    if (!submitterEmail || suggestion.isAnonymous) return;

     const mailOptions = {
        from: `"vyomsetu-club" <${process.env.GMAIL_USER}>`,
        to: submitterEmail,
        subject: `Response to your suggestion: "${suggestion.title}"`,
        html: `
            <h1>Response to your Suggestion</h1>
            <p><strong>${responder.name}</strong> has responded to your suggestion titled "<strong>${suggestion.title}</strong>".</p>
            <p>You can view the full discussion by clicking the link below.</p>
            <a href="${appUrl}/dashboard/suggestions">View Response</a>
        `,
    };
    await transporter.sendMail(mailOptions);
};


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, suggestion } = body;

        switch(type) {
            case 'new-suggestion':
                const { allUsers } = body;
                await sendNewSuggestionEmail(suggestion, allUsers);
                break;
            case 'new-response':
                const { responder } = body;
                await sendNewResponseEmail(suggestion, responder);
                break;
            default:
                return NextResponse.json({ error: 'Invalid email type.' }, { status: 400 });
        }

        return NextResponse.json({ message: 'Email sent successfully!' }, { status: 200 });

    } catch (error) {
        console.error('Error handling suggestion email:', error);
        return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
    }
}
