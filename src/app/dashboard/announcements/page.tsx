/**
 * @fileoverview Announcements Page Entry Point.
 * @description This is a frontend (FE) file that serves as the entry point for the
 * `/dashboard/announcements` route.
 *
 * It wraps the main `AnnouncementsPage` client component in a React `<Suspense>` boundary.
 * This is necessary because the parent layout (`/dashboard/layout.tsx`) uses the `useSearchParams`
 * hook, and Next.js requires child client components that might be rendered based on those search
 * params to be wrapped in Suspense to avoid build errors.
 *
 * Linked Files:
 * - `src/components/dashboard/announcements/page.tsx`: The main component for this page.
 *
 * Tech Used:
 * - Next.js: Page routing.
 * - React: For Suspense component.
 */
'use client';

import AnnouncementsPage from '@/components/dashboard/announcements/page';
import { Suspense } from 'react';

function AnnouncementsPageWrapper() {
    return <AnnouncementsPage />;
}

export default function Announcements() {
    return (
        <Suspense>
            <AnnouncementsPageWrapper />
        </Suspense>
    );
}
