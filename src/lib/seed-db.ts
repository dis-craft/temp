
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
