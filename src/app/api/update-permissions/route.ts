import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// This function is a bit dangerous as it modifies a source file.
// In a real-world scenario, this data should be stored in a database.
export async function POST(req: NextRequest) {
    try {
        const { action, domain, email, newLeadEmail } = await req.json();

        if (!action || !domain) {
            return NextResponse.json({ error: 'Action and domain are required.' }, { status: 400 });
        }

        const configFilePath = path.join(process.cwd(), 'src', 'lib', 'domain-config.ts');
        let fileContent = await fs.readFile(configFilePath, 'utf-8');

        if (action === 'add-member') {
            if (!email) return NextResponse.json({ error: 'Email is required for adding a member.' }, { status: 400 });
            fileContent = await addMember(fileContent, domain, email);
        } else if (action === 'remove-member') {
            if (!email) return NextResponse.json({ error: 'Email is required for removing a member.' }, { status: 400 });
            fileContent = await removeMember(fileContent, domain, email);
        } else if (action === 'update-lead') {
            if (!newLeadEmail) return NextResponse.json({ error: 'New lead email is required.' }, { status: 400 });
            fileContent = await updateLead(fileContent, domain, newLeadEmail);
        } else {
            return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
        }
        
        await fs.writeFile(configFilePath, fileContent, 'utf-8');

        return NextResponse.json({ message: 'Permissions updated successfully. Reloading to apply changes.' }, { status: 200 });

    } catch (error: any) {
        console.error('Error updating permissions config:', error);
        // Check if the error is a custom error from the helper functions
        if (error.message.includes('not found') || error.message.includes('already exists')) {
             return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// Helper functions to manipulate the file content string

async function addMember(content: string, domain: string, email: string): Promise<string> {
    const membersRegex = new RegExp(`('${domain}':\\s*{\\s*lead:\\s*'.*?',\\s*members:\\s*\\[)([\\s\\S]*?)(\\s*\\])`, 'm');
    const match = content.match(membersRegex);

    if (!match) throw new Error(`Domain "${domain}" not found in config file.`);

    const existingMembersString = match[2];
    const existingMembers = existingMembersString.split(',').map(e => e.trim().replace(/['"]/g, '')).filter(Boolean);

    if (existingMembers.includes(email)) throw new Error('This email already exists in the domain.');
    
    const newMembersString = existingMembersString ? `${existingMembersString.trim()},\n            '${email}'` : `\n            '${email}'\n        `;
    
    return content.replace(membersRegex, `$1${newMembersString}$3`);
}

async function removeMember(content: string, domain: string, email: string): Promise<string> {
    const membersRegex = new RegExp(`('${domain}':\\s*{\\s*lead:\\s*'.*?',\\s*members:\\s*\\[)([\\s\\S]*?)(\\s*\\])`, 'm');
    const match = content.match(membersRegex);

    if (!match) throw new Error(`Domain "${domain}" not found in config file.`);
    
    const existingMembersString = match[2];
    const existingMembers = existingMembersString.split(',').map(e => e.trim().replace(/['"]/g, '')).filter(Boolean);

    if (!existingMembers.includes(email)) throw new Error('Email not found in this domain.');

    const newMembers = existingMembers.filter(e => e !== email);
    const newMembersString = newMembers.length > 0 ? `\n            ${newMembers.map(e => `'${e}'`).join(',\n            ')}\n        ` : '';

    return content.replace(membersRegex, `$1${newMembersString}$3`);
}

async function updateLead(content: string, domain: string, newLeadEmail: string): Promise<string> {
    const leadRegex = new RegExp(`('${domain}':\\s*{\\s*lead:\\s*)'.*?'`, 'm');

    if (!leadRegex.test(content)) throw new Error(`Domain "${domain}" not found or lead not configured.`);

    return content.replace(leadRegex, `$1'${newLeadEmail}'`);
}
