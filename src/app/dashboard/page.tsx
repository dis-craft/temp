/**
 * @fileoverview Main Dashboard Page Entry Point.
 * @description This is a frontend (FE) file that serves as the entry point for the
 * primary dashboard route (`/dashboard`).
 *
 * Its sole purpose is to import and render the main `Dashboard` component, which
 * contains all the logic and UI for displaying and managing tasks. This separation of
 * concerns keeps the page file clean and modular.
 *
 * Linked Files:
 * - `src/components/dashboard/index.tsx`: The main component rendered by this page.
 *
 * Tech Used:
 * - Next.js: Page routing.
 * - React: Component rendering.
 */
import Dashboard from '@/components/dashboard';

export default function DashboardPage() {
    return <Dashboard />;
}
