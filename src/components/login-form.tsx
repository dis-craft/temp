/**
 * @fileoverview Login and Sign-Up Form Component.
 * @description This is a frontend (FE) client-side component that provides the complete UI and logic
 * for user authentication. It handles email/password sign-up, email/password sign-in, Google sign-in,
 * and password reset functionality.
 *
 * How it works:
 * - It uses ShadCN's `Tabs` component to switch between "Sign In" and "Sign Up" forms.
 * - It uses `react-hook-form` and `zod` for robust form validation on all input fields.
 * - It communicates directly with the Firebase Authentication SDK for all auth operations
 *   (e.g., `createUserWithEmailAndPassword`, `signInWithPopup`).
 * - **Authorization Check**: Before any sign-in or sign-up attempt, it now calls `isEmailAuthorized`
 *   to verify that the user's email has been pre-registered in the system by an admin. If not,
 *   the auth attempt is blocked, and an error is shown.
 * - Upon successful authentication, it calls the `handleAuth` function to create a corresponding
 *   user document in Firestore if one doesn't already exist.
 *
 * Linked Files:
 * - `src/lib/firebase.ts`: Imports the Firebase app instance (`app`) and auth functions.
 * - `src/lib/types.ts`: Imports the `User` type definition.
 * - `src/lib/logger.ts`: Imports the `logActivity` function for auditing.
 * - `src/app/login/page.tsx`: This component is rendered by the main login page.
 *
 * Tech Used:
 * - React: For component state and logic.
 * - Next.js: For routing (`useRouter`).
 * - Firebase SDK: For all authentication methods.
 * - ShadCN UI: For `Tabs`, `Button`, `Input`, `Form`, `AlertDialog`, etc.
 * - Zod / react-hook-form: For form validation.
 */
'use client';

import * as React from 'react';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { app, db, sendPasswordReset } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Chrome, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { User } from '@/lib/types';
import { formatUserName } from '@/lib/utils';
import { logActivity } from '@/lib/logger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [isForgotPassDialogOpen, setIsForgotPassDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  
  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const isEmailAuthorized = async (email: string): Promise<boolean> => {
    // Check special roles
    const specialRolesRef = doc(db, 'config', 'specialRoles');
    const specialRolesSnap = await getDoc(specialRolesRef);
    if (specialRolesSnap.exists() && specialRolesSnap.data()[email]) {
        return true;
    }

    // Check domain leads and members
    const domainsQuery = query(collection(db, 'domains'));
    const domainsSnapshot = await getDocs(domainsQuery);
    for (const domainDoc of domainsSnapshot.docs) {
        const domainData = domainDoc.data();
        if ((domainData.leads || []).includes(email) || (domainData.members || []).includes(email)) {
            return true;
        }
    }
    
    return false;
  };


  const getRoleForEmail = async (email: string): Promise<{ role: User['role']; domain?: User['domain'] }> => {
    // Check special roles first
    const specialRolesRef = doc(db, 'config', 'specialRoles');
    const specialRolesSnap = await getDoc(specialRolesRef);
    if (specialRolesSnap.exists()) {
        const specialRolesData = specialRolesSnap.data();
        if (specialRolesData[email]) {
            return { role: specialRolesData[email] };
        }
    }
    
    // Check domain leads and members
    const domainsQuery = query(collection(db, 'domains'));
    const domainsSnapshot = await getDocs(domainsQuery);
    for (const domainDoc of domainsSnapshot.docs) {
        const domainData = domainDoc.data();
        const domainName = domainDoc.id as User['domain'];
        if ((domainData.leads || []).includes(email)) {
            return { role: 'domain-lead', domain: domainName };
        }
        if ((domainData.members || []).includes(email)) {
            return { role: 'member', domain: domainName };
        }
    }

    // This should ideally not be reached if isEmailAuthorized is checked first.
    return { role: 'member', domain: undefined };
  };


  const handleAuth = async (user: import('firebase/auth').User, name?: string) => {
    const userRef = doc(db, 'users', user.uid);
    let userSnap = await getDoc(userRef);
    
    let userData: User;

    if (!userSnap.exists()) {
      const { role, domain } = await getRoleForEmail(user.email || '');
      const newUser: User = {
        id: user.uid,
        name: name || user.displayName,
        email: user.email,
        avatarUrl: user.photoURL,
        role: role,
        domain: domain || null,
      };
      await setDoc(userRef, newUser);
      userData = newUser;
      await logActivity(`New user signed up: ${user.email}`, 'Authentication', newUser);
    } else {
        userData = userSnap.data() as User;
        await logActivity(`User signed in: ${user.email}`, 'Authentication', userData);
    }

    const allUsersSnapshot = await getDocs(collection(db, 'users'));
    const allUsers = allUsersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));

    toast({
      title: 'Login Successful',
      description: `Welcome back, ${formatUserName(userData, allUsers)}!`,
    });
    router.push('/dashboard');
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      if (!email) {
          throw new Error("Could not retrieve email from Google Sign-In.");
      }

      const authorized = await isEmailAuthorized(email);
      if (!authorized) {
        await auth.signOut(); // Important: sign out the unauthorized user from Firebase
        toast({
            variant: 'destructive',
            title: 'Unauthorized Access',
            description: "This email address is not authorized to access this platform. Please contact an administrator."
        });
        return; // Stop execution
      }

      await handleAuth(result.user);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
      await logActivity(`Google sign-in failed: ${error.message}`, 'Error', null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setIsLoading(true);
    const authorized = await isEmailAuthorized(values.email);
    if (!authorized) {
        toast({
            variant: 'destructive',
            title: 'Unauthorized Access',
            description: "This email address is not authorized to sign up. Please contact an administrator to be added to the system."
        });
        setIsLoading(false);
        return;
    }

    const auth = getAuth(app);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await handleAuth(userCredential.user, values.name);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign Up Failed', description: error.message });
      await logActivity(`Email sign-up failed for ${values.email}: ${error.message}`, 'Error', null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    setIsLoading(true);
    const authorized = await isEmailAuthorized(values.email);
    if (!authorized) {
        toast({
            variant: 'destructive',
            title: 'Unauthorized Access',
            description: "This email address is not authorized to access this platform."
        });
        setIsLoading(false);
        return;
    }

    const auth = getAuth(app);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      await handleAuth(userCredential.user);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign In Failed', description: error.message });
       await logActivity(`Email sign-in failed for ${values.email}: ${error.message}`, 'Error', null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetRequest = async (values: z.infer<typeof forgotPasswordSchema>) => {
    setIsResetting(true);
    try {
        await sendPasswordReset(values.email);
        toast({
            title: 'Password Reset Email Sent',
            description: `A password reset link has been sent to ${values.email}.`,
        });
        setIsForgotPassDialogOpen(false);
        forgotPasswordForm.reset();
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Request Failed',
            description: error.message,
        });
    } finally {
        setIsResetting(false);
    }
  };

  return (
    <Tabs defaultValue="signin" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>
      <TabsContent value="signin">
        <div className="py-4">
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
                <AlertDialog open={isForgotPassDialogOpen} onOpenChange={setIsForgotPassDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="link" className="p-0 h-auto">Forgot Password?</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Reset Password</AlertDialogTitle>
                            <AlertDialogDescription>
                                Enter your email address and we will send you a link to reset your password.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Form {...forgotPasswordForm}>
                            <form onSubmit={forgotPasswordForm.handleSubmit(handlePasswordResetRequest)} className="space-y-4">
                                <FormField
                                    control={forgotPasswordForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="name@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <Button type="submit" disabled={isResetting}>
                                        {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Send Reset Link
                                    </Button>
                                </AlertDialogFooter>
                            </form>
                        </Form>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      </TabsContent>
      <TabsContent value="signup">
        <div className="py-4">
            <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <FormField
                      control={signUpForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="name@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="********" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 animate-spin" />}
                      Create Account
                    </Button>
                </form>
            </Form>
        </div>
      </TabsContent>
      <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
              Or continue with
              </span>
          </div>
      </div>
      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
            <Loader2 className="mr-2 animate-spin" />
        ) : (
          <Chrome className="mr-2" />
        )}
        Google
      </Button>
    </Tabs>
  );
}
