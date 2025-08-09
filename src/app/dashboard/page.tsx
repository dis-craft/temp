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
import Dashboard from '@/components/dashboard';
import { Logo } from '@/components/icons';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { User, Role, Permission } from '@/lib/types';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

const hasPermission = (user: User, permission: Permission) => {
    return user.role?.permissions?.includes(permission) ?? false;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          if (userData.roleId) {
            const roleRef = doc(db, 'roles', userData.roleId);
            const roleDoc = await getDoc(roleRef);
            if (roleDoc.exists()) {
              userData.role = roleDoc.data() as Role;
            }
          }
          setUser(userData);
        } else {
          setUser(null);
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
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
    return null; // or a fallback UI
  }

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
              <span className="text-lg font-bold font-headline text-primary">TaskMaster Pro</span>
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
              {hasPermission(user, 'manage_roles') && (
                  <SidebarMenuItem>
                    <Link href="/dashboard/roles" className='w-full'>
                        <SidebarMenuButton tooltip="Manage Roles" isActive={pathname === '/dashboard/roles'}>
                        <ShieldCheck />
                        <span>Manage Roles</span>
                        </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
              )}
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

function DashboardPage() {
    return <Dashboard />;
}

export { DashboardPage };
