import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { domainConfig } from '@/lib/domain-config'; // Import to get structure
import type { User } from '@/lib/types';


export async function POST(req: NextRequest) {
    try {
        const { domain, email } = await req.json();

        if (!domain || !email) {
            return NextResponse.json({ error: 'Domain and email are required.' }, { status: 400 });
        }

        const configFilePath = path.join(process.cwd(), 'src', 'lib', 'domain-config.ts');
        
        let fileContent = await fs.readFile(configFilePath, 'utf-8');

        // This is a simplified parser. It assumes a specific structure of the domain-config.ts file.
        // It looks for the domain definition and injects the new email into the members array.
        const domainKey = `'${domain}'` as const;
        const membersRegex = new RegExp(`(${domainKey}:\\s*{\\s*lead:\\s*'.*?',\\s*members:\\s*\\[)([\\s\\S]*?)(\\s*\\])`, 'm');
        
        const match = fileContent.match(membersRegex);

        if (!match) {
            return NextResponse.json({ error: `Domain "${domain}" not found in config file.` }, { status: 404 });
        }

        const existingMembersString = match[2];
        const existingMembers = existingMembersString
            .split(',')
            .map(e => e.trim().replace(/['"]/g, ''))
            .filter(Boolean);
        
        if (existingMembers.includes(email)) {
            return NextResponse.json({ error: 'This email already exists in the domain.'}, { status: 409 });
        }
        
        // Add the new email to the list.
        const newMembers = [...existingMembers, email];
        
        // Format the new members array string.
        const newMembersString = `\n            ${newMembers.map(e => `'${e}'`).join(',\n            ')}\n        `;

        const newFileContent = fileContent.replace(membersRegex, `$1${newMembersString}$3`);

        await fs.writeFile(configFilePath, newFileContent, 'utf-8');

        return NextResponse.json({ message: 'Domain config updated successfully.' }, { status: 200 });

    } catch (error) {
        console.error('Error updating domain config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
