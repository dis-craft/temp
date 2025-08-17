/**
 * @fileoverview Firebase Admin SDK Initialization.
 * @description This is a server-side only (BE) file responsible for initializing the
 * Firebase Admin SDK. It is crucial for backend operations that require elevated
 * privileges, such as updating a user's core authentication record.
 *
 * How it works:
 * - It checks if the required environment variables are set. These variables should
 *   contain the details from your Firebase service account credentials JSON file.
 * - It initializes the Firebase Admin app using these credentials. If the app is already
 *   initialized, it retrieves the existing instance to avoid duplication.
 *
 * This file should never be imported into a client-side component, as it exposes service
 * account credentials.
 *
 * Linked Files:
 * - `.env`: Must contain `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
 * - `src/app/api/update-profile/route.ts`: Imports and uses the `adminApp`.
 *
 * Tech Used:
 * - Firebase Admin SDK (`firebase-admin`): For privileged backend operations.
 */
import * as admin from 'firebase-admin';

let adminAppInstance: admin.app.App;

if (!admin.apps.length) {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('Firebase Admin SDK environment variables are not set. SDK will not be initialized. This is expected during client-side builds, but will cause runtime errors if API routes using it are called.');
    // Create a proxy or a placeholder that will throw an error only if used
    adminAppInstance = new Proxy({} as admin.app.App, {
        get(target, prop) {
            if (prop in target) {
                 return target[prop as keyof typeof target];
            }
            throw new Error('Firebase Admin SDK was not initialized because one or more required environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) were not provided.');
        }
    });
  } else {
    // The private key must have newlines properly escaped in the environment variable.
    // Vercel automatically handles this, but for .env files, they must be literal `\n`.
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const serviceAccount: admin.ServiceAccount = {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey,
    };
    
    adminAppInstance = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
  }
} else {
    adminAppInstance = admin.apps[0]!;
}

export const adminApp = adminAppInstance;
