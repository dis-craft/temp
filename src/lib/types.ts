export interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: 'super-admin' | 'admin' | 'domain-lead' | 'member';
  domain?: 'Mechanical' | 'Electrical' | 'Software';
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
  id:string;
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  assignees: User[];
  comments: Comment[];
  submissions: Submission[];
  attachment?: string;
  domain?: 'Mechanical' | 'Electrical' | 'Software';
}
