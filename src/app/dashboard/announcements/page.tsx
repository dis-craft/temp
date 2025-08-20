// app/dashboard/announcements/page.tsx  (server component)
import { Suspense } from 'react';
import AnnouncementsPage from '@/components/dashboard/announcements/page'; // your client file
import { Loader2 } from 'lucide-react';

export default function AnnouncementsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <AnnouncementsPage />
    </Suspense>
  );
}
