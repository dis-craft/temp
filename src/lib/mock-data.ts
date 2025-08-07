import type { User, Task } from './types';

export const allUsers: User[] = [
  { id: 'user-1', name: 'Alex Johnson', email: 'alex@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=alex', role: 'domain-lead' },
  { id: 'user-2', name: 'Maria Garcia', email: 'maria@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=maria', role: 'member' },
  { id: 'user-3', name: 'James Smith', email: 'james@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=james', role: 'member' },
  { id: 'user-4', name: 'Priya Patel', email: 'priya@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=priya', role: 'admin' },
  { id: 'user-5', name: 'Chen Wei', email: 'chen@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=chen', role: 'member' },
];

export const allTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Develop Q3 Marketing Strategy',
    description: 'Create a comprehensive marketing strategy for the third quarter, focusing on new user acquisition and brand awareness. The strategy should include digital campaigns, content marketing initiatives, and social media outreach.',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(),
    status: 'In Progress',
    assignees: [allUsers[1], allUsers[2]],
    attachment: 'Q3-Marketing-Brief.pdf',
    comments: [
      { id: 'comment-1', text: 'Just started on the campaign mockups. Will share by EOD.', author: allUsers[1], timestamp: new Date().toISOString() },
    ],
    submissions: [
      { id: 'sub-1', author: allUsers[1], file: 'draft_v1.pdf', timestamp: new Date().toISOString(), qualityScore: 85 },
    ],
  },
  {
    id: 'task-2',
    title: 'Refactor Authentication Service',
    description: 'Update the legacy authentication service to use modern security practices, including OAuth 2.0 and MFA. The goal is to improve security and reduce latency. The codebase should be fully documented.',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 25)).toISOString(),
    status: 'Pending',
    assignees: [allUsers[4], allUsers[1]],
    attachment: 'Auth-Refactor-Specs.pdf',
    comments: [],
    submissions: [],
  },
  {
    id: 'task-3',
    title: 'Onboarding Documentation for New Hires',
    description: 'Prepare a complete set of onboarding documents for the engineering department. This should include a guide to the development environment, coding standards, and project structure.',
    dueDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
    status: 'In Progress',
    assignees: [allUsers[3]],
    comments: [],
    submissions: [],
  },
  {
    id: 'task-4',
    title: 'User Profile Page UI/UX Design',
    description: 'Design a new user profile page that is both aesthetically pleasing and highly functional. The design should be responsive and include areas for user settings, activity feeds, and personal information.',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(),
    status: 'Completed',
    assignees: [allUsers[1], allUsers[2], allUsers[4]],
    attachment: 'UI-UX-Profile-Guidelines.pdf',
    comments: [
       { id: 'comment-2', text: 'Final designs are approved and attached.', author: allUsers[0], timestamp: new Date().toISOString() },
    ],
    submissions: [
      { id: 'sub-2', author: allUsers[1], file: 'profile_design_final.pdf', timestamp: new Date().toISOString(), qualityScore: 95 },
      { id: 'sub-3', author: allUsers[2], file: 'profile_assets.zip', timestamp: new Date().toISOString(), qualityScore: 92 },
      { id: 'sub-4', author: allUsers[4], file: 'profile_prototype.fig', timestamp: new Date().toISOString(), qualityScore: 98 },
    ],
  },
];
