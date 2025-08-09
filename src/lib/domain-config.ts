import type { User } from './types';

// Configuration for special roles not tied to a domain
export const specialRolesConfig: Record<string, 'super-admin' | 'admin'> = {
    'mrsrikart@gmail.com': 'super-admin',
    'admin@taskmaster.pro': 'admin',
};

// Configuration for domains, their leads, and their members
export const domainConfig: Record<User['domain'] & string, { lead: string, members: string[] }> = {
    'Mechanical': {
        lead: '5245929.class9.srikar@gmail.com',
        members: [
            // Add member emails for Mechanical domain here
            // e.g., 'member1@example.com',
        ]
    },
    'Electrical': {
        lead: 'cadmvj69@gmail.com',
        members: [
            // Add member emails for Electrical domain here
        ]
    },
    'Software': {
        lead: 'cadpwdis12345678atcad@gmail.com',
        members: [
            // Add member emails for Software domain here
        ]
    }
};
