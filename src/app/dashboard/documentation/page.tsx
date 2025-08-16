/**
 * @fileoverview Documentation Page Entry Point.
 * @description This is a frontend (FE) file that serves as the entry point for the
 * `/dashboard/documentation` route.
 *
 * Its sole purpose is to import and render the main `Documentation` component, which
 * contains all the logic and UI for the feature. This separation of concerns keeps the
 * page file clean and delegates the functionality to a dedicated component.
 *
 * Linked Files:
 * - `src/components/dashboard/documentation/index.tsx`: The main component for this page.
 *
 * Tech Used:
 * - Next.js: Page routing.
 * - React: Component rendering.
 */
'use client';

import Documentation from '@/components/dashboard/documentation';

export default function DocumentationPage() {
    return <Documentation />;
}
