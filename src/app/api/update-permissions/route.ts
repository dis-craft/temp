import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// This function is a bit dangerous as it modifies a source file.
// In a real-world scenario, this data should be stored in a database.
export async function POST(req: NextRequest) {
    try {
        const { action, domain, email, newLeadEmail, role } = await req.json();

        if (!action) {
            return NextResponse.json({ error: 'Action is required.' }, { status: 400 });
        }

        const configFilePath = path.join(process.cwd(), 'src', 'lib', 'domain-config.ts');
        let fileContent = await fs.readFile(configFilePath, 'utf-8');

        if (action === 'add-member') {
            if (!email || !domain) return NextResponse.json({ error: 'Email and domain are required for adding a member.' }, { status: 400 });
            fileContent = await addMember(fileContent, domain, email);
        } else if (action === 'remove-member') {
            if (!email || !domain) return NextResponse.json({ error: 'Email and domain are required for removing a member.' }, { status: 400 });
            fileContent = await removeMember(fileContent, domain, email);
        } else if (action === 'add-lead') {
            if (!domain || !email) return NextResponse.json({ error: 'Domain and lead email are required.' }, { status: 400 });
            fileContent = await addLead(fileContent, domain, email);
        } else if (action === 'remove-lead') {
            if (!domain || !email) return NextResponse.json({ error: 'Domain and lead email are required.' }, { status: 400 });
            fileContent = await removeLead(fileContent, domain, email);
        } else if (action === 'add-special-role') {
            if (!email || !role) return NextResponse.json({ error: 'Email and role are required for adding a special role.' }, { status: 400 });
            fileContent = await addSpecialRole(fileContent, email, role);
        } else if (action === 'remove-special-role') {
            if (!email) return NextResponse.json({ error: 'Email is required for removing a special role.' }, { status: 400 });
            fileContent = await removeSpecialRole(fileContent, email);
        }
        else {
            return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
        }
        
        await fs.writeFile(configFilePath, fileContent, 'utf-8');

        return NextResponse.json({ message: 'Permissions updated successfully. Reloading to apply changes.' }, { status: 200 });

    } catch (error: any) {
        console.error('Error updating permissions config:', error);
        // Check if the error is a custom error from the helper functions
        if (error.message.includes('not found') || error.message.includes('already exists') || error.message.includes('cannot remove')) {
             return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// Helper functions to manipulate the file content string

async function addMember(content: string, domain: string, email: string): Promise<string> {
    const membersRegex = new RegExp(`('${domain}':\\s*{\\s*leads:\\s*\\[[\\s\\S]*?\\],\\s*members:\\s*\\[)([\\s\\S]*?)(\\s*\\])`, 'm');
    const match = content.match(membersRegex);

    if (!match) throw new Error(`Domain "${domain}" not found in config file.`);

    const existingMembersString = match[2];
    const existingMembers = existingMembersString.split(',').map(e => e.trim().replace(/['"]/g, '')).filter(Boolean);

    if (existingMembers.includes(email)) throw new Error('This email already exists in the domain.');
    
    const newMembersString = existingMembers.length > 0 
        ? `${existingMembersString.trim()},\n            '${email}'` 
        : `\n            '${email}'\n        `;
    
    return content.replace(membersRegex, `$1${newMembersString}$3`);
}

async function removeMember(content: string, domain: string, email: string): Promise<string> {
    const membersRegex = new RegExp(`('${domain}':\\s*{\\s*leads:\\s*\\[[\\s\\S]*?\\],\\s*members:\\s*\\[)([\\s\\S]*?)(\\s*\\])`, 'm');
    const match = content.match(membersRegex);

    if (!match) throw new Error(`Domain "${domain}" not found in config file.`);
    
    const existingMembersString = match[2];
    const existingMembers = existingMembersString.split(',').map(e => e.trim().replace(/['"]/g, '')).filter(Boolean);

    if (!existingMembers.includes(email)) throw new Error('Email not found in this domain.');

    const newMembers = existingMembers.filter(e => e !== email);
    const newMembersString = newMembers.length > 0 ? `\n            ${newMembers.map(e => `'${e}'`).join(',\n            ')}\n        ` : '';

    return content.replace(membersRegex, `$1${newMembersString}$3`);
}

async function addLead(content: string, domain: string, email: string): Promise<string> {
    const leadsRegex = new RegExp(`('${domain}':\\s*{\\s*leads:\\s*\\[)([\\s\\S]*?)(\\s*\\])`, 'm');
    const match = content.match(leadsRegex);

    if (!match) throw new Error(`Domain "${domain}" not found in config file.`);

    const existingLeadsString = match[2];
    const existingLeads = existingLeadsString.split(',').map(e => e.trim().replace(/['"]/g, '')).filter(Boolean);

    if (existingLeads.includes(email)) throw new Error('This email is already a lead for this domain.');
    
    const newLeadsString = existingLeads.length > 0 
        ? `${existingLeadsString.trim()},\n            '${email}'` 
        : `\n            '${email}'\n        `;
    
    return content.replace(leadsRegex, `$1${newLeadsString}$3`);
}

async function removeLead(content: string, domain: string, email: string): Promise<string> {
    const leadsRegex = new RegExp(`('${domain}':\\s*{\\s*leads:\\s*\\[)([\\s\\S]*?)(\\s*\\])`, 'm');
    const match = content.match(leadsRegex);

    if (!match) throw new Error(`Domain "${domain}" not found in config file.`);
    
    const existingLeadsString = match[2];
    const existingLeads = existingLeadsString.split(',').map(e => e.trim().replace(/['"]/g, '')).filter(Boolean);

    if (!existingLeads.includes(email)) throw new Error('Email not found in this domain\'s leads.');

    const newLeads = existingLeads.filter(e => e !== email);
    const newLeadsString = newLeads.length > 0 ? `\n            ${newLeads.map(e => `'${e}'`).join(',\n            ')}\n        ` : '';

    return content.replace(leadsRegex, `$1${newLeadsString}$3`);
}


async function addSpecialRole(content: string, email: string, role: 'super-admin' | 'admin'): Promise<string> {
    const specialRolesRegex = /(export const specialRolesConfig: Record<string, 'super-admin' | 'admin'> = {)([\s\S]*?)(};)/m;
    const match = content.match(specialRolesRegex);

    if (!match) throw new Error('specialRolesConfig object not found.');

    const existingRolesString = match[2];
    if (existingRolesString.includes(`'${email}'`)) {
        throw new Error('This email already has a special role.');
    }

    const newRoleString = `\n    '${email}': '${role}',`;
    return content.replace(specialRolesRegex, `$1${existingRolesString.trim()}${newRoleString}\n$3`);
}

async function removeSpecialRole(content: string, email: string): Promise<string> {
    const specialRolesRegex = /(export const specialRolesConfig: Record<string, 'super-admin' | 'admin'> = {)([\s\S]*?)(};)/m;
    const match = content.match(specialRolesRegex);

    if (!match) throw new Error('specialRolesConfig object not found.');

    const existingRolesString = match[2];
    if (!existingRolesString.includes(`'${email}'`)) {
        throw new Error('Email not found in special roles.');
    }

    // This is a simple regex replacement, might be brittle if formatting changes.
    const regexToRemove = new RegExp(`\\s*'${email}':\\s*'.*?',?`, 'g');
    const newRolesString = existingRolesString.replace(regexToRemove, '');
    
    return content.replace(specialRolesRegex, `$1${newRolesString}$3`);
}
