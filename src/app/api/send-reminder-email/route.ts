/**
 * @fileoverview API Route for Sending Task Reminder Emails.
 * @description This is a backend (BE) Next.js API route that sends email reminders to users
 * who have not yet submitted their work for a specific task.
 *
 * It is triggered by a user action (e.g., a domain lead clicking a "Remind" button).
 * The POST request should contain the task details, a list of members who haven't submitted,
 * and the domain lead's email to be CC'd.
 *
 * It uses Nodemailer and Gmail's SMTP server to dispatch a formatted HTML email to all
 * unsubmitted members, reminding them of the task and its due date.
 *
 * Linked Files:
 * - `.env`: Requires `GMAIL_USER` and `GMAIL_APP_PASSWORD` for Nodemailer.
 * - `src/components/dashboard/task-details-modal.tsx`: The frontend modal that calls this API.
 *
 * Tech Used:
 * - Next.js API Routes: The API framework.
 * - Nodemailer: For sending emails.
 */
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  const { task, unsubmittedMembers, domainLeadEmail } = await req.json();

  if (!task || !unsubmittedMembers || unsubmittedMembers.length === 0 || !domainLeadEmail) {
    return NextResponse.json({ error: 'Missing required fields or no members to remind.' }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const memberEmails = unsubmittedMembers.map((user: { email: string }) => user.email).filter(Boolean);

  if (memberEmails.length === 0) {
    return NextResponse.json({ error: 'No valid member emails found.' }, { status: 400 });
  }
  
  const appUrl = 'https://vyomsetu-club.vercel.app/';
  const taskUrl = `${appUrl}/dashboard`;

  const mailOptions = {
    from: `"vyomsetu-club" <${process.env.GMAIL_USER}>`,
    to: memberEmails.join(','),
    cc: domainLeadEmail,
    subject: `Reminder: Task Submission Required for "${task.title}"`,
    html: `
      <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h1 style="color: #d9534f; font-size: 24px; border-bottom: 2px solid #eee; padding-bottom: 10px;">Task Reminder</h1>
          <p style="font-size: 16px;">Hello team,</p>
          <p style="font-size: 16px;">This is a friendly reminder that the following task is awaiting your submission:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #333; font-size: 20px; margin-top: 0;">${task.title}</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}
            </p>
          </div>
          <p style="font-size: 16px; text-align: center;">
            <a href="${taskUrl}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">View Task and Submit</a>
          </p>
          <p style="font-size: 14px; color: #555;">Please complete your submission as soon as possible.</p>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">
            This is an automated notification from vyomsetu-club.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return NextResponse.json({ message: 'Reminder email sent successfully!' }, { status: 200 });
  } catch (error) {
    console.error('Error sending reminder email:', error);
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
  }
}
