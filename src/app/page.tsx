'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  ListTodo,
  Settings,
  Users,
} from 'lucide-react';
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
import Dashboard from '@/components/dashboard';
import { Logo } from '@/components/icons';

export default function Home() {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
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
                <SidebarMenuButton tooltip="Dashboard" isActive>
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Tasks">
                  <ListTodo />
                  <span>Tasks</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Team">
                  <Users />
                  <span>Team</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings">
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="bg-background flex-1">
          <main className="h-full p-4 md:p-6 lg:p-8">
            <Dashboard />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
