import type { User } from './types';

// Configuration for special roles not tied to a domain
export const specialRolesConfig: Record<string, 'super-admin' | 'admin'> = {
    'mrsrikart@gmail.com': 'super-admin',
    'admin@taskmaster.pro': 'admin',
};

// Configuration for domains, their leads, and their members
export const domainConfig: Record<User['domain'] & string, { lead: string, members: string[] }> = {
    'Mechanical': {
        lead: 'mechdomainlead@gmail.com',
        members: [
            '5245929.class9.srikar@gmail.com',
            'shashanknm9535@gmail.com',
            'cadpwdis12345678atcad@gmail.com',
            'mem2mechdomain@gmail.com',
            // Add member emails for Mechanical domain here
            // e.g.
            'member1@example.com'
        ]
    },
    'Electrical': {
        lead: 'electricaldomainlead@gmail.com',
        members: [
            'cadmvj69@gmail.com'
            // Add member emails for Electrical domain here
        ]
    },
    'Software': {
        lead: 'softwaredomainlead@gmail.com',
        members: [
            
            // Add member emails for Software domain here
        ]
    }
};
