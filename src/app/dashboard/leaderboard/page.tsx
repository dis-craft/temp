/**
 * @fileoverview Leaderboard Page Entry Point.
 * @description This is a frontend (FE) file that serves as the entry point for the
 * `/dashboard/leaderboard` route.
 *
 * Its sole purpose is to import and render the main `Leaderboard` component, which
 * contains all the logic and UI for the feature. This separation of concerns keeps the
 * page file clean and delegates the functionality to a dedicated component.
 *
 * Linked Files:
 * - `src/components/dashboard/leaderboard.tsx`: The main component for this page.
 *
 * Tech Used:
 * - Next.js: Page routing.
 * - React: Component rendering.
 */
'use client';

import Leaderboard from '@/components/dashboard/leaderboard';

export default function LeaderboardPage() {
    return <Leaderboard />;
}
