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
        </div>
    );
}
