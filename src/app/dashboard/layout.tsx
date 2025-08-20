
import { Suspense } from 'react';
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <DashboardLayoutClient>
        {children}
      </DashboardLayoutClient>
    </Suspense>
  );
}
