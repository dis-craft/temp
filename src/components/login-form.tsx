'use client';

import * as React from 'react';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, writeBatch, addDoc } from 'firebase/firestore';
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
import type { Role } from '@/lib/types';

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = React.useState(false);
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
  
  const createInitialPermissions = async (batch: any) => {
    const permissions = [
      { id: 'manage_roles', name: 'Manage Roles' },
      { id: 'create_task', name: 'Create Task' },
      { id: 'edit_task', name: 'Edit Task' },
      { id: 'review_submissions', name: 'Review Submissions' },
      { id: 'view_all_tasks', name: 'View All Tasks' },
      { id: 'submit_work', name: 'Submit Work' },
    ];
    const permissionsRef = collection(db, 'permissions');
    const existingPermsSnap = await getDocs(permissionsRef);
    const existingPerms = existingPermsSnap.docs.map(d => d.id);
    
    permissions.forEach(p => {
        if (!existingPerms.includes(p.id)) {
            batch.set(doc(db, 'permissions', p.id), { name: p.name });
        }
    });
  };

  const getOrCreateRole = async (email: string): Promise<Role> => {
    const batch = writeBatch(db);
    await createInitialPermissions(batch);
    
    let roleName = 'member';
    let rolePermissions = ['submit_work'];

    if (email === 'super-admin@taskmaster.pro') {
      roleName = 'super-admin';
      rolePermissions = ['manage_roles', 'create_task', 'edit_task', 'review_submissions', 'view_all_tasks', 'submit_work'];
    } else if (email === 'admin@taskmaster.pro' || email === 'mrsrikart@gmail.com') {
      roleName = 'admin';
      rolePermissions = ['create_task', 'edit_task', 'review_submissions', 'view_all_tasks', 'submit_work'];
    } else if (email === 'lead@taskmaster.pro') {
      roleName = 'domain-lead';
      rolePermissions = ['create_task', 'edit_task', 'review_submissions'];
    }

    const rolesRef = collection(db, 'roles');
    const q = query(rolesRef, where('name', '==', roleName));
    const roleSnap = await getDocs(q);

    let roleData: Role;

    if (roleSnap.empty) {
      const newRoleRef = doc(collection(db, 'roles'));
      roleData = { id: newRoleRef.id, name: roleName, permissions: rolePermissions };
      batch.set(newRoleRef, { name: roleName, permissions: rolePermissions });
    } else {
      const existingRole = roleSnap.docs[0];
      roleData = { ...existingRole.data(), id: existingRole.id } as Role;
      // Ensure super-admin always has manage_roles
      if (roleName === 'super-admin' && !roleData.permissions.includes('manage_roles')) {
          roleData.permissions.push('manage_roles');
          batch.update(existingRole.ref, { permissions: arrayUnion('manage_roles') });
      }
    }
    
    await batch.commit();
    return roleData;
  }

  const handleAuth = async (user: import('firebase/auth').User, name?: string) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const role = await getOrCreateRole(user.email || '');
      await setDoc(userRef, {
        id: user.uid,
        name: name || user.displayName,
        email: user.email,
        avatarUrl: user.photoURL,
        role: role,
      });
    }
    toast({
      title: 'Login Successful',
      description: `Welcome back, ${name || user.displayName}!`,
    });
    router.push('/dashboard');
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleAuth(result.user);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setIsLoading(true);
    const auth = getAuth(app);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await handleAuth(userCredential.user, values.name);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign Up Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    setIsLoading(true);
    const auth = getAuth(app);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      await handleAuth(userCredential.user);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign In Failed', description: error.message });
    } finally {
      setIsLoading(false);
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
        className="w-full"
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
