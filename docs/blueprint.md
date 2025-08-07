# **App Name**: TaskMaster Pro

## Core Features:

- Role-Based Dashboard: Role-Based Dashboard: Displays appropriate UI elements and functionalities based on the user's role (super-admin, admin, domain-lead, member) retrieved from Firestore.
- Task Creation: Task Management: Domain leads can create tasks with descriptions, due dates, and PDF attachments (uploaded to Cloudflare R2).
- Submission System: Submission Uploads: Members upload task submissions as PDFs via presigned URLs directly to Cloudflare R2.
- Email Automation: Automated Email Reminders: Sends daily reminders for overdue tasks with attached PDF specifications using Nodemailer and Gmail SMTP, triggered by GitHub Actions.
- Task Details: Task Detail Modal: Display task specifications PDF previews, assignees and input area to create comment and a quality score slider.
- AI-Powered Task Assignment Suggestions: Intelligent Task Router: The system will use a tool to assess task descriptions, using insights to pre-select a default set of suggested assignees and reminders intervals to aid domain leads during the creation process.
- Real-Time Updates: Real-time Updates: Display Firestore data updates in real-time using listeners, providing immediate feedback on task assignments, submissions, and comments.

## Style Guidelines:

- Primary color: Vibrant blue (#2962FF) to convey a sense of productivity and trust.
- Background color: Light blue-gray (#E9EEFF), desaturated hue of the primary for a calm and professional backdrop.
- Accent color: Purple (#9D4EDD) to highlight important interactive elements and notifications.
- Headline font: 'Space Grotesk', a proportional sans-serif font with a techy feel for headlines and short descriptions; Body font: 'Inter', a grotesque-style sans-serif font, will be used in other places of the website.
- Code font: 'Source Code Pro' for displaying code snippets.
- Use a set of modern, minimalist icons to represent different task categories and actions.
- Implement a clean and intuitive layout with a focus on readability and user-friendliness; role-based views with clear information architecture for different user roles.