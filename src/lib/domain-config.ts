import type { User } from './types';

// Configuration for special roles not tied to a domain
export const specialRolesConfig: Record<string, 'super-admin' | 'admin'> = {
    'super-admin@taskmaster.pro': 'super-admin',
    'admin2@gmail.com': 'admin',
};

// Configuration for domains, their leads, and their members
export const domainConfig: Record<User['domain'] & string, { leads: string[], members: string[] }> = {
    'Mechanical': {
        leads: ['mechdomainlead@gmail.com'],
        members: [
            '5245929.class9.srikar@gmail.com',
            'shashanknm9535@gmail.com',
            'cadpwdis12345678atcad@gmail.com',
            'mem2mechdomain@gmail.com',
            'member1@example.com'
        ]
    },
    'Electrical': {
        leads: [
            'electricaldomainlead@gmail.com'
        ],
        members: [
            'cadmvj69@gmail.com'
        ]
    },
    'Software': {
        leads: ['softwaredomainlead@gmail.com'],
        members: [
            
        ]
    }
};
