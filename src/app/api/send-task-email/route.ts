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

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: assigneeEmails.join(','),
    cc: domainLeadEmail,
    subject: `New Task Assigned: ${task.title}`,
    html: `
      <h1>New Task: ${task.title}</h1>
      <p>A new task has been assigned to you.</p>
      <h2>Details:</h2>
      <p><strong>Description:</strong> ${task.description}</p>
      <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
      <p>Please log in to TaskMaster Pro to view the full details.</p>
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
