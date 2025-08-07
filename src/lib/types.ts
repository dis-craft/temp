export type UserRole = 'super-admin' | 'admin' | 'domain-lead' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
}

export interface Comment {
  id: string;
  text: string;
  author: User;
  timestamp: string;
}

export interface Submission {
  id: string;
  author: User;
  file: string;
  timestamp: string;
  qualityScore?: number;
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  assignees: User[];
  comments: Comment[];
  submissions: Submission[];
  attachment?: string;
}
