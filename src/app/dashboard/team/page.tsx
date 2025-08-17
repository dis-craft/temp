
'use client';

import * as React from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';
import type { User as UserType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatUserName } from '@/lib/utils';


const RoleSection = ({ title, users, allUsers, badgeClass }: { title: string, users: UserType[], allUsers: UserType[], badgeClass?: string }) => {
    if (users.length === 0) return null;
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold font-headline">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {users.map(user => (
                    <Card key={user.id} className="text-center p-4">
                        <CardContent className="flex flex-col items-center gap-2">
                            <Avatar className="h-20 w-20 border-2">
                                <AvatarImage src={user.avatarUrl || ''} />
                                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <p className="font-semibold">{formatUserName(user, allUsers)}</p>
                                <Badge variant="outline" className={badgeClass}>{user.domain ? `${user.domain} - ${user.role}` : user.role}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default function TeamPage() {
    const [allUsers, setAllUsers] = React.useState<UserType[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserType)));
            setIsLoading(false);
        }, (error) => {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error loading users' });
            setIsLoading(false);
        });

        return () => {
            usersUnsub();
        };
    }, [toast]);

    const groupedUsers = React.useMemo(() => {
        const groups: Record<string, UserType[]> = {
            'super-admin': [],
            'admin': [],
            'domain-lead': [],
            'member': []
        };
        allUsers.forEach(user => {
            if (groups[user.role]) {
                groups[user.role].push(user);
            }
        });
        
        // Sort each group alphabetically by name
        for(const role in groups) {
            groups[role].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        return groups;

    }, [allUsers]);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="w-full h-full flex flex-col space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Users /> The Team</h1>
                    <p className="text-muted-foreground">Meet the members driving the club forward.</p>
                </div>
            </header>

            <div className="space-y-8 overflow-y-auto flex-1 pr-2 -mr-2">
                 <RoleSection title="Super Admins" users={groupedUsers['super-admin']} allUsers={allUsers} badgeClass="border-destructive text-destructive" />
                 <RoleSection title="Admins" users={groupedUsers['admin']} allUsers={allUsers} badgeClass="border-primary text-primary" />
                 <RoleSection title="Domain Leads" users={groupedUsers['domain-lead']} allUsers={allUsers} badgeClass="border-secondary-foreground" />
                 <RoleSection title="Members" users={groupedUsers['member']} allUsers={allUsers} badgeClass="border-muted-foreground" />
            </div>
        </div>
    )
}
