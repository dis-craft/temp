/**
 * @fileoverview API Route for Sending Password Reset Admin Notifications.
 * @description This is a backend (BE) Next.js API route created specifically to notify
 * an administrator when a user has requested a password reset.
 *
 * It is called by the `sendPasswordReset` function in `src/lib/firebase.ts`. It takes the user's
 * email from the POST request body and uses Nodemailer to send a simple, formatted email to the
 * admin email address (`vyomsetuclub@gmail.com`).
 *
 * This creates an audit trail and an immediate notification for security-sensitive events.
 *
 * Linked Files:
 * - `.env`: Requires `GMAIL_USER` and `GMAIL_APP_PASSWORD` for Nodemailer.
 * - `src/lib/firebase.ts`: The `sendPasswordReset` function calls this API.
 *
 * Tech Used:
 * - Next.js API Routes: The API framework.
 * - Nodemailer: For sending emails.
 */
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"vyomsetu-club" <${process.env.GMAIL_USER}>`,
    to: 'vyomsetuclub@gmail.com', // Admin email address
    subject: `Password Reset Request Notification`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset Request</h2>
        <p>This is an automated notification to inform you that a password reset has been initiated for the following user:</p>
        <p><strong>User Email:</strong> ${email}</p>
        <p>If you were not expecting this, you may want to check the activity logs for more details.</p>
        <br/>
        <p><em>- The Vyomsetu Club Platform</em></p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return NextResponse.json({ message: 'Admin notification sent successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    // Don't block the user flow if this fails, just log it.
    return NextResponse.json({ error: 'Failed to send admin notification.' }, { status: 500 });
  }
}