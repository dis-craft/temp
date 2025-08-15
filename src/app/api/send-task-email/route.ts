
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  const { task, assignees, domainLeadEmail } = await req.json();

  if (!task || !assignees || !domainLeadEmail) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const assigneeEmails = assignees.map((user: { email: string }) => user.email).filter(Boolean);

  if (assigneeEmails.length === 0) {
    return NextResponse.json({ error: 'No valid assignee emails found.' }, { status: 400 });
  }

  const appUrl = 'https://vyomsetuclub.vercel.app';
  const taskUrl = `${appUrl}/dashboard`; 
  
  let attachmentLink = '';
  if (task.attachment) {
    const r2PublicUrl = `https://pub-e16353913e234fe6a351f78006b008e3.r2.dev`;
    const downloadUrl = `${r2PublicUrl}/${task.attachment}`;
    attachmentLink = `
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>Attachment:</strong> <a href="${downloadUrl}" style="color: #007bff; text-decoration: none;" target="_blank" rel="noopener noreferrer">Download Attached File</a>
        </p>
      `;
  }


  const mailOptions = {
    from: `"vyomsetu-club" <${process.env.GMAIL_USER}>`,
    to: assigneeEmails.join(','),
    cc: domainLeadEmail,
    subject: `New Task Assigned: ${task.title}`,
    html: `
      <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h1 style="color: #222; font-size: 24px; border-bottom: 2px solid #eee; padding-bottom: 10px;">New Task Assigned</h1>
          <p style="font-size: 16px;">Hello team,</p>
          <p style="font-size: 16px;">A new task has been assigned to you:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #333; font-size: 20px; margin-top: 0;">${task.title}</h2>
            <p style="font-size: 16px; margin-bottom: 10px;">
              <strong>Description:</strong> ${task.description}
            </p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}
            </p>
            ${attachmentLink}
          </div>
          <p style="font-size: 16px; text-align: center;">
            <a href="${taskUrl}" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">View Task Details</a>
          </p>
           <p style="font-size: 14px; color: #555;">Please login to Vyomsetu official website to view full details.</p>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">
            This is an automated notification from vyomsetu-club.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return NextResponse.json({ message: 'Email sent successfully!' }, { status: 200 });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
  }
}
