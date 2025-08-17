/**
 * @fileoverview Login Page Component.
 * @description This is a frontend (FE) file that renders the login and sign-up page for the application.
 * It's a client component (`'use client'`) because it contains interactive elements.
 *
 * How it works:
 * - It provides the main layout for the login screen, including the app logo and title.
 * - It renders the `LoginForm` component, which contains the actual logic for handling
 *   user authentication (both email/password and Google Sign-In).
 *
 * Linked Files:
 * - `src/components/login-form.tsx`: This is the primary component rendered on the page, containing
 *   the authentication logic.
 * - `src/components/icons.tsx`: Imports the `Logo` SVG component.
 *
 * Tech Used:
 * - Next.js: For page routing.
 * - React: For component structure.
 * - ShadCN UI / Tailwind CSS: For styling the layout.
 */
'use client';
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/icons";

export default function LoginPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="flex items-center gap-2">
                        <Logo className="size-8 text-primary" />
                        <span className="text-2xl font-bold font-headline text-primary">vyomsetu-club</span>
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-center mb-2 font-headline">Welcome</h1>
                <p className="text-center text-muted-foreground mb-8">Sign in or create an account to continue.</p>
                <LoginForm />
            </div>
             <div className="absolute bottom-4 w-full max-w-md">
                <div className="w-full border-t border-border"></div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                    Contact for support: <a href="mailto:vyomsetuclub@gmail.com" className="text-primary hover:underline">vyomsetuclub@gmail.com</a>
                </p>
            </div>
        </div>
    );
}
