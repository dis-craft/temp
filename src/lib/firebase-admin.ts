/**
 * @fileoverview Firebase Admin SDK Initialization.
 * @description This is a server-side only (BE) file responsible for initializing the
 * Firebase Admin SDK. It is crucial for backend operations that require elevated
 * privileges, such as updating a user's core authentication record.
 *
 * How it works:
 * - It checks if the `FIREBASE_ADMIN_CONFIG` environment variable is set. This variable should
 *   contain the JSON string of your Firebase service account credentials.
 * - It parses this JSON string to get the credentials.
 * - It initializes the Firebase Admin app using these credentials. If the app is already
 *   initialized, it retrieves the existing instance to avoid duplication.
 * - It exports the initialized `adminApp` for use in other backend files (like API routes).
 *
 * This file should never be imported into a client-side component, as it exposes service
 * account credentials.
 *
 * Linked Files:
 * - `.env`: Must contain the `FIREBASE_ADMIN_CONFIG` variable.
 * - `src/app/api/update-profile/route.ts`: Imports and uses the `adminApp`.
 *
 * Tech Used:
 * - Firebase Admin SDK (`firebase-admin`): For privileged backend operations.
 */
import * as admin from 'firebase-admin';

if (!process.env.FIREBASE_ADMIN_CONFIG) {
    throw new Error('The FIREBASE_ADMIN_CONFIG environment variable is not set.');
}

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CONFIG);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export const adminApp = admin.apps[0]!;
