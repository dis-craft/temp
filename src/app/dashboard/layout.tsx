'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  ListTodo,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { User } from '@/lib/types';
import { doc, onSnapshot } from 'firebase/firestore';


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsub = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUser({ id: doc.id, ...doc.data() } as User);
          }
          setLoading(false);
        });
        return () => unsub();
      } else {
        router.push('/login');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);
  
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  const isSuperAdmin = user.role === 'super-admin';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar
          className="border-r"
          collapsible="icon"
          variant="sidebar"
        >
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
              <Logo className="size-6 text-primary" />
              <span className="text-lg font-bold font-headline text-primary">vyomsetu-club</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                 <Link href="/dashboard" className='w-full'>
                    <SidebarMenuButton tooltip="Dashboard" isActive={pathname === '/dashboard'}>
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="bg-background flex-1">
          <main className="h-full p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
