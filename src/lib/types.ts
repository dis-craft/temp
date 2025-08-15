

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: 'super-admin' | 'admin' | 'domain-lead' | 'member';
  domain?: 'Mechanical' | 'Electrical' | 'Software' | 'Documentation' | string | null;
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
  remarks?: string;
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Unassigned';

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
  domain?: 'Mechanical' | 'Electrical' | 'Software' | string;
  assignedToLead?: User;
}

export interface SiteStatus {
    emergencyShutdown: boolean;
    maintenanceMode: boolean;
    maintenanceETA?: string;
}

export type SuggestionCategory = 'Bug Report' | 'Feature Request' | 'UI/UX Improvement' | 'General Feedback';
export type SuggestionPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type SuggestionStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface SuggestionResponse {
  id: string;
  text: string;
  author: User;
  timestamp: string;
}

export interface Suggestion {
  id: string;
  submitter: User;
  isAnonymous: boolean;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  title: string;
  description: string;
  status: SuggestionStatus;
  timestamp: string;
  domain: string | null;
  responses: SuggestionResponse[];
}

// Documentation Hub Types
export interface DocumentationItem {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: string;
    createdBy: User;
    type: 'folder' | 'file';
    viewableBy: string[]; // e.g., ['admin', 'Mechanical-lead', 'Software-member']
}

export interface DocumentationFolder extends DocumentationItem {
    type: 'folder';
}

export interface DocumentationFile extends DocumentationItem {
    type: 'file';
    filePath: string; // Key for R2
    mimeType: string;
}

export type AnnouncementTarget = 'all' | `role-${User['role']}` | `domain-${NonNullable<User['domain']>}`;

export interface Announcement {
    id: string;
    title: string;
    content: string;
    author: User;
    createdAt: string; // ISO Date String
    publishAt: string; // ISO Date String
    targets: AnnouncementTarget[];
    status: 'draft' | 'published' | 'archived';
    sent: boolean;
}
