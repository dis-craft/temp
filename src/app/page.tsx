/**
 * @fileoverview Root Page and Authentication Router.
 * @description This is a frontend (FE) client component that serves as the entry point for the
 * root URL ('/'). Its primary responsibility is to handle authentication-based routing.
 *
 * How it works:
 * - It uses the `useEffect` hook to run logic on the client side after the component mounts.
 * - It initializes a Firebase Auth state listener (`onAuthStateChanged`).
 * - If a user is logged in, it redirects them to the `/dashboard`.
 * - If no user is logged in, it redirects them to the `/login` page.
 * - While the check is in progress, it displays a loading spinner to provide feedback to the user.
 *
 * This effectively makes the root page a protected route that directs users to the appropriate
 * location based on their authentication status.
 *
 * Linked Files:
 * - `src/lib/firebase.ts`: Imports the Firebase app instance to initialize auth.
 * - `/dashboard`: The route to redirect to on successful authentication.
 * - `/login`: The route to redirect to if unauthenticated.
 *
 * Tech Used:
 * - Next.js: For routing (`useRouter`).
 * - React: For `useEffect` and `useState` hooks.
 * - Firebase SDK: For `getAuth` and `onAuthStateChanged`.
 * - Lucide-React: For the `Loader2` spinner icon.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
