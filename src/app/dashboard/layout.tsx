

'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  Database,
  Hammer,
  Lightbulb,
  BookOpen,
  Megaphone,
  Trophy,
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
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { User, SiteStatus } from '@/lib/types';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatUserName } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logActivity } from '@/lib/logger';


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [siteStatus, setSiteStatus] = React.useState<SiteStatus | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    const auth = getAuth(app);
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubUser = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUser({ id: doc.id, ...doc.data() } as User);
          }
          // setLoading should be managed carefully with siteStatus
        });

        return () => unsubUser();
      } else {
        router.push('/login');
        setLoading(false);
      }
    });
    
    const siteStatusRef = doc(db, 'config', 'siteStatus');
    const unsubscribeSiteStatus = onSnapshot(siteStatusRef, (doc) => {
        if(doc.exists()) {
            setSiteStatus(doc.data() as SiteStatus);
        } else {
            setSiteStatus({ emergencyShutdown: false, maintenanceMode: false });
        }
        setLoading(false);
    });

    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
        setAllUsers(usersData);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSiteStatus();
      unsubscribeUsers();
    };
  }, [router]);
  
  const handleSignOut = async () => {
    await logActivity(`User signed out: ${user?.email}`, 'Authentication', user);
    getAuth(app).signOut();
  }
  
  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const isSuperAdmin = user.role === 'super-admin';
  const isAdmin = user.role === 'admin';
  const canManagePermissions = isSuperAdmin || isAdmin;
  const formattedUserName = formatUserName(user, allUsers);

  const isLockedOut = (siteStatus?.emergencyShutdown || siteStatus?.maintenanceMode) && !isSuperAdmin && !isAdmin;

  if (isLockedOut) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
            <Hammer className="h-4 w-4" />
            <AlertTitle>{siteStatus?.emergencyShutdown ? 'Emergency Shutdown' : 'Under Maintenance'}</AlertTitle>
            <AlertDescription>
            {siteStatus?.maintenanceMode && siteStatus.maintenanceETA
                ? `The site is currently under maintenance. We expect to be back online around ${siteStatus.maintenanceETA}.`
                : "The site is temporarily unavailable. Please check back later."}
            </AlertDescription>
        </Alert>
      </div>
    )
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
            <div className="flex items-center justify-center gap-2 p-2">
                <Logo className="size-6 shrink-0 text-primary group-data-[collapsible=icon]:group-data-[state=expanded]:hidden" />
                <Image src="https://placehold.co/32x32.png" alt="Vyomsetu Club Logo" width={32} height={32} className="hidden size-8 group-data-[collapsible=icon]:group-data-[state=collapsed]:block" data-ai-hint="logo" />
                <span className="text-lg font-bold font-headline text-primary group-data-[collapsible=icon]:group-data-[state=collapsed]:hidden">vyomsetu-club</span>
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
              <SidebarMenuItem>
                <Link href="/dashboard/announcements" className="w-full">
                  <SidebarMenuButton tooltip="Announcements" isActive={pathname === '/dashboard/announcements'}>
                    <Megaphone />
                    <span>Announcements</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <Link href="/dashboard/leaderboard" className="w-full">
                  <SidebarMenuButton tooltip="Leaderboard" isActive={pathname === '/dashboard/leaderboard'}>
                    <Trophy />
                    <span>Leaderboard</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/dashboard/suggestions" className="w-full">
                  <SidebarMenuButton tooltip="Suggestions" isActive={pathname === '/dashboard/suggestions'}>
                    <Lightbulb />
                    <span>Suggestions</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/dashboard/documentation" className="w-full">
                  <SidebarMenuButton tooltip="Documentation" isActive={pathname.startsWith('/dashboard/documentation')}>
                    <BookOpen />
                    <span>Documentation</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              {canManagePermissions && (
                <>
                  <SidebarMenuItem>
                    <Link href="/dashboard/permissions" className='w-full'>
                        <SidebarMenuButton tooltip="Manage Permissions" isActive={pathname === '/dashboard/permissions'}>
                          <ShieldCheck />
                          <span>Manage Permissions</span>
                        </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                </>
              )}
               {isSuperAdmin && (
                <>
                  <SidebarMenuItem>
                    <Link href="/dashboard/maintenance" className='w-full'>
                        <SidebarMenuButton tooltip="Maintenance" isActive={pathname === '/dashboard/maintenance'}>
                          <Hammer />
                          <span>Maintenance</span>
                        </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Link href="/dashboard/logs" className='w-full'>
                        <SidebarMenuButton tooltip="Activity Logs" isActive={pathname === '/dashboard/logs'}>
                          <Database />
                          <span>Activity Logs</span>
                        </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="bg-background flex-1 md:pl-[--sidebar-width-icon]">
          <header className="flex items-center justify-between p-4 border-b md:p-6 lg:p-8">
            <div className='flex items-center gap-2'>
                <SidebarTrigger className='md:hidden'/>
                <div>
                    <h1 className="text-2xl font-bold font-headline md:text-3xl">{user.domain ? `${user.domain} Domain` : 'Dashboard'}</h1>
                    <p className="text-muted-foreground hidden md:block">Welcome back, {formattedUserName}.</p>
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full border-2 border-black dark:border-white">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl || undefined} alt={user.name || ''} />
                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{formattedUserName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                    Sign Out
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="h-full p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
