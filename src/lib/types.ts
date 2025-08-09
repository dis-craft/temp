export type Permission = 
  | 'create_task'
  | 'edit_task'
  | 'review_submissions'
  | 'manage_roles';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  roleId: string | null;
  // For convenience, we can merge role data here
  role?: Role;
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
}
