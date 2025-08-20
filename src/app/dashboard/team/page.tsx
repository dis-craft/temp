
'use client';

import TeamPage from '@/components/dashboard/team/page';
import { Suspense } from 'react';

function TeamPageWrapper() {
    return <TeamPage />;
}

export default function Team() {
    return (
        <Suspense>
            <TeamPageWrapper />
        </Suspense>
    );
}
