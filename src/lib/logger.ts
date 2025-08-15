

'use server';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from './types';

export type LogCategory = 
    | 'Authentication'
    | 'Task Management'
    | 'Permissions'
    | 'Domain Management'
    | 'Site Status'
    | 'Submissions'
    | 'Suggestions'
    | 'Documentation Hub'
    | 'Error';

export interface Log {
    id?: string;
    message: string;
    timestamp: any;
    user?: {
        id: string;
        email: string | null;
        name: string | null;
    };
    category: LogCategory;
}

/**
 * Logs an activity to the 'logs' collection in Firestore.
 * @param message - A descriptive message of the activity.
 * @param category - The category of the log entry.
 * @param user - The user who performed the action. Can be null for system actions.
 */
export async function logActivity(
    message: string,
    category: LogCategory,
    user: User | null
) {
    try {
        const logEntry: Omit<Log, 'id'| 'timestamp'> & { timestamp: any } = {
            message,
            category,
            timestamp: serverTimestamp(),
        };

        if (user) {
            logEntry.user = {
                id: user.id,
                email: user.email || 'N/A',
                name: user.name || 'Anonymous'
            };
        }
        
        await addDoc(collection(db, 'logs'), logEntry);

    } catch (error) {
        console.error("Failed to log activity:", error);
        // Optionally, you could log this failure to another system or console
    }
}
