/**
 * @fileoverview Database Seeding Script.
 * @description This is a backend (BE) utility script designed to populate the Firestore
 * database with initial data. It's intended to be run once during the initial setup
 * of the application.
 *
 * How it works:
 * - It defines two configuration objects: `domainConfig` for creating domain documents
 *   and `specialRolesConfig` for setting up initial admin users.
 * - The `seedDatabase` function first checks if the 'domains' collection already has data
 *   to prevent accidental re-seeding.
 * - It uses a Firestore `writeBatch` to efficiently perform multiple write operations
 *   (creating domain documents and the special roles configuration) as a single atomic unit.
 *
 * This script is crucial for setting up the application's foundational data structure
 * for permissions and user organization.
 *
 * Linked Files:
 * - `src/lib/firebase.ts`: Imports the Firestore database instance (`db`).
 * - This script is not directly linked to any running part of the app but is a standalone
 *   utility that would be manually executed by a developer.
 *
 * Tech Used:
 * - Firebase Firestore: The target database.
 * - Firebase Admin SDK (server-side): For performing batch writes.
 */
'use server';

import { db } from './firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';

const domainConfig = {
  "Mechanical": {
    "leads": ["mechdomainlead@gmail.com"],
    "members": [
        "mem2mechdomain@gmail.com",
        "member1@example.com",
        "mem3mechdomain@gmail.com",
        "shashank@gmail.com",
        "srikanth.devarasetty.dev@gmail.com"
    ]
  },
  "Electrical": {
    "leads": [],
    "members": []
  },
  "Software": {
    "leads": [],
    "members": []
  },
  "Documentation": {
      "leads": ["doclead@example.com"],
      "members": []
  }
};

const specialRolesConfig = {
    "super-admin@taskmaster.pro": "super-admin",
    "vyomsetuclub@gmail.com": "super-admin",
    "doclead@example.com": "domain-lead",
};


// This is a one-time script to seed the database with the initial domain configuration.
// You can run this from a server-side component or an API route if needed, but ensure it only runs once.

export async function seedDatabase() {
    const batch = writeBatch(db);

    // Check if domains are already seeded to prevent duplicates
    const domainsCollection = collection(db, 'domains');
    const domainsSnapshot = await getDocs(domainsCollection);
    if (!domainsSnapshot.empty) {
        console.log('Domains collection already seeded. Aborting.');
        return { message: "Database has already been seeded." };
    }

    console.log('Seeding domains...');
    // Seed domains
    for (const domainName in domainConfig) {
        const config = domainConfig[domainName as keyof typeof domainConfig];
        const domainRef = doc(db, 'domains', domainName);
        batch.set(domainRef, {
            name: domainName,
            ...config
        });
    }

    console.log('Seeding special roles...');
    // Seed special roles
    const specialRolesRef = doc(db, 'config', 'specialRoles');
    batch.set(specialRolesRef, specialRolesConfig);


    try {
        await batch.commit();
        console.log('Database seeded successfully!');
        return { message: "Database seeded successfully!" };
    } catch (e) {
        console.error("Error seeding database: ", e);
        throw new Error("Error seeding database.");
    }
}
