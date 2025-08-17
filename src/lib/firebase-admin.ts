/**
 * @fileoverview Firebase Admin SDK Initialization.
 * @description This is a server-side only (BE) file responsible for initializing the
 * Firebase Admin SDK. It is crucial for backend operations that require elevated
 * privileges, such as updating a user's core authentication record.
 *
 * How it works:
 * - It checks if the `FIREBASE_ADMIN_CONFIG` environment variable is set. This variable should
 *   contain the **Base64 encoded** JSON string of your Firebase service account credentials.
 * - It decodes the Base64 string and parses the resulting JSON to get the credentials.
 * - It initializes the Firebase Admin app using these credentials. If the app is already
 *   initialized, it retrieves the existing instance to avoid duplication.
 *
 * This file should never be imported into a client-side component, as it exposes service
 * account credentials.
 *
 * Linked Files:
 * - `.env`: Must contain the `FIREBASE_ADMIN_CONFIG` variable (Base64 encoded).
 * - `src/app/api/update-profile/route.ts`: Imports and uses the `adminApp`.
 *
 * Tech Used:
 * - Firebase Admin SDK (`firebase-admin`): For privileged backend operations.
 */
import * as admin from 'firebase-admin';


let adminAppInstance: admin.app.App;

if (!admin.apps.length) {
  if (!process.env.FIREBASE_ADMIN_CONFIG) {
    console.warn('FIREBASE_ADMIN_CONFIG is not set. Firebase Admin SDK will not be initialized. This is expected during build, but will cause runtime errors if API routes using it are called.');
    // Create a proxy or a placeholder that will throw an error only if used
    adminAppInstance = new Proxy({} as admin.app.App, {
        get(target, prop) {
            if (prop in target) {
                 return target[prop as keyof typeof target];
            }
            throw new Error('Firebase Admin SDK was not initialized because FIREBASE_ADMIN_CONFIG was not provided.');
        }
    });
  } else {
    const serviceAccountString = Buffer.from(process.env.FIREBASE_ADMIN_CONFIG, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountString);
    adminAppInstance = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
  }
} else {
    adminAppInstance = admin.apps[0]!;
}

export const adminApp = adminAppInstance;
