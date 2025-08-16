/**
 * @fileoverview Root Layout Component.
 * @description This is the root layout component for the entire Next.js application. It's a
 * server-side rendered (SSR) frontend (FE) file that wraps every page.
 *
 * How it works:
 * - It defines the basic HTML structure (`<html>`, `<head>`, `<body>`).
 * - It imports and applies the global stylesheet (`globals.css`).
 * - It includes `<link>` tags to import custom fonts from Google Fonts ('Inter', 'Space Grotesk',
 *   'Source Code Pro') which are used throughout the application as defined in `tailwind.config.ts`.
 * - It renders the `Toaster` component, which is responsible for displaying all pop-up
 *   notifications (toasts) application-wide.
 * - It includes the Firebase SDK scripts for authentication, which are necessary for the
 *   client-side Firebase logic to function.
 * - The `{children}` prop is where the content of individual pages will be rendered.
 *
 * Linked Files:
 * - `src/app/globals.css`: The global stylesheet.
 * - `src/components/ui/toaster.tsx`: The component for displaying notifications.
 * - `tailwind.config.ts`: Defines which font families are used (`font-body`, `font-headline`).
 * - All page components are rendered as `children` within this layout.
 *
 * Tech Used:
 * - Next.js: For the layout convention and metadata handling.
 * - React: For component structure.
 * - Google Fonts: For custom web fonts.
 */
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'vyomsetu-club',
  description: 'A professional task management application.',
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Source+Code+Pro&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full">
        {children}
        <Toaster />
        <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js" async></script>
        <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js" async></script>
      </body>
    </html>
  );
}
