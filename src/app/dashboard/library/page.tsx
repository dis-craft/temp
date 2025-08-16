/**
 * @fileoverview Library Page (Legacy).
 * @description This frontend (FE) file was the original entry point for the `/dashboard/library`
 * route. It has since been superseded by `/dashboard/documentation`.
 * 
 * This file is now considered legacy and may be removed in a future cleanup. Its purpose was to
 * render the `Library` component.
 *
 * NOTE: This file and its corresponding folder (`/library`) have been renamed to `/documentation`
 * to better reflect the feature's purpose. This file might still exist temporarily but is no longer
 * in active use.
 *
 * Linked Files:
 * - `src/components/dashboard/library/index.tsx`: The component this page used to render.
 *
 * Tech Used:
 * - Next.js: Page routing.
 * - React: Component rendering.
 */
'use client';

import Library from '@/components/dashboard/library';

export default function LibraryPage() {
    return <Library />;
}
