import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'TaskMaster Pro',
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
