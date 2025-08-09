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
  
  const appUrl = 'https://vyomsetuclub.vercel.app';
  const taskUrl = `${appUrl}/dashboard`;

  const mailOptions = {
    from: `"TaskMaster Pro" <${process.env.GMAIL_USER}>`,
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
            This is an automated notification from TaskMaster Pro.
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
