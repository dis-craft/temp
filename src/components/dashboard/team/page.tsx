
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Mail, Edit } from 'lucide-react';
import type { User as UserType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { formatUserName } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.204-1.634a11.815 11.815 0 005.785 1.511h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"></path>
    </svg>
);


const RoleSection = ({ title, users, badgeClass, isModifyMode, onEdit }: { title: string, users: UserType[], badgeClass?: string, isModifyMode: boolean, onEdit: (user: UserType) => void }) => {
    if (users.length === 0) return null;
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold font-headline">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {users.map(user => (
                    <Card key={user.id} className="text-center flex flex-col">
                        <CardContent className="p-4 flex flex-col items-center gap-2 flex-grow">
                            <Avatar className="h-20 w-20 border-2">
                                <AvatarImage src={user.avatarUrl || ''} />
                                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <p className="font-semibold">{user.name}</p>
                                <Badge variant="outline" className={badgeClass}>{user.domain ? `${user.domain} - ${user.role}` : user.role}</Badge>
                            </div>
                        </CardContent>
                         <CardFooter className="flex-col items-center justify-center gap-2 pt-2">
                             <Separator className="mb-2" />
                            {user.email && (
                                <Link href={`mailto:${user.email}`} passHref className="w-full">
                                    <Button variant="ghost" size="sm" className="w-full h-8 text-xs truncate">
                                        <Mail className="h-4 w-4 mr-2" />
                                        {user.email}
                                    </Button>
                                </Link>
                            )}
                            {user.phoneNumber && (
                                <Link href={`https://wa.me/${user.phoneNumber}`} passHref target="_blank" rel="noopener noreferrer" className="w-full">
                                    <Button variant="ghost" size="sm" className="w-full h-8 text-xs">
                                        <WhatsAppIcon className="h-4 w-4 mr-2" />
                                        WhatsApp
                                    </Button>
                                </Link>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}

const MemberSection = ({ users, isModifyMode, onEdit }: { users: UserType[], isModifyMode: boolean, onEdit: (user: UserType) => void }) => {
    const membersByDomain = React.useMemo(() => {
        const grouped: Record<string, UserType[]> = {};
        users.forEach(user => {
            const domain = user.domain || 'Unassigned';
            if (!grouped[domain]) {
                grouped[domain] = [];
            }
            grouped[domain].push(user);
        });
        // Sort domains alphabetically, but put 'Unassigned' last
        return Object.entries(grouped).sort(([domainA], [domainB]) => {
            if (domainA === 'Unassigned') return 1;
            if (domainB === 'Unassigned') return -1;
            return domainA.localeCompare(domainB);
        });
    }, [users]);
    
    if (users.length === 0) return null;

    return (
         <div className="space-y-6">
            <h2 className="text-xl font-bold font-headline">Members</h2>
            {membersByDomain.map(([domain, domainUsers]) => (
                <div key={domain}>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">{domain}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {domainUsers.map(user => (
                             <Card key={user.id} className="text-center flex flex-col">
                                <CardContent className="p-4 flex flex-col items-center gap-2 flex-grow">
                                    <Avatar className="h-20 w-20 border-2">
                                        <AvatarImage src={user.avatarUrl || ''} />
                                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <p className="font-semibold">{user.name}</p>
                                        <Badge variant="outline" className="border-muted-foreground">{user.role}</Badge>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex-col items-center justify-center gap-2 pt-2">
                                    <Separator className="mb-2" />
                                    {user.email && (
                                        <Link href={`mailto:${user.email}`} passHref className="w-full">
                                            <Button variant="ghost" size="sm" className="w-full h-8 text-xs truncate">
                                                <Mail className="h-4 w-4 mr-2" />
                                                {user.email}
                                            </Button>
                                        </Link>
                                    )}
                                    {user.phoneNumber && (
                                        <Link href={`https://wa.me/${user.phoneNumber}`} passHref target="_blank" rel="noopener noreferrer" className="w-full">
                                            <Button variant="ghost" size="sm" className="w-full h-8 text-xs">
                                                 <WhatsAppIcon className="h-4 w-4 mr-2" />
                                                 WhatsApp
                                            </Button>
                                        </Link>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function TeamPage() {
    const [allUsers, setAllUsers] = React.useState<UserType[]>([]);
    const [authorizedEmails, setAuthorizedEmails] = React.useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = React.useState(true);
    const [currentUser, setCurrentUser] = React.useState<UserType | null>(null);
    const [isModifyMode, setIsModifyMode] = React.useState(false);
    const { toast } = useToast();
    const router = useRouter();


    React.useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
            if(user) {
                const userDocRef = doc(db, 'users', user.uid);
                onSnapshot(userDocRef, (doc) => {
                     if(doc.exists()) {
                        setCurrentUser({ id: user.uid, ...doc.data() } as UserType);
                    }
                });
            }
        });

        const unsubs: (()=>void)[] = [];

        // Listener for all authorized emails from domains and special roles
        const domainsQuery = query(collection(db, 'domains'));
        const unsubDomains = onSnapshot(domainsQuery, (snapshot) => {
            const emails = new Set<string>();
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                (data.leads || []).forEach((e: string) => emails.add(e));
                (data.members || []).forEach((e: string) => emails.add(e));
            });
             setAuthorizedEmails(prev => {
                const newEmails = new Set(prev);
                emails.forEach(e => newEmails.add(e));
                return newEmails;
            });
        });
        unsubs.push(unsubDomains);
        
        const unsubSpecialRoles = onSnapshot(doc(db, 'config', 'specialRoles'), (doc) => {
             if (doc.exists()) {
                const data = doc.data();
                const emails = new Set(Object.keys(data));
                 setAuthorizedEmails(prev => {
                    const newEmails = new Set(prev);
                    emails.forEach(e => newEmails.add(e));
                    return newEmails;
                });
            }
        });
        unsubs.push(unsubSpecialRoles);


        // Listener for user data
        const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserType)));
            setIsLoading(false);
        }, (error) => {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error loading users' });
            setIsLoading(false);
        });
        unsubs.push(usersUnsub);

        return () => {
            unsubs.forEach(unsub => unsub());
            unsubAuth();
        };
    }, [toast]);
    
    const handleEditUser = (user: UserType) => {
        router.push('/dashboard/permissions');
    }

    const filteredAndGroupedUsers = React.useMemo(() => {
        const groups: Record<string, UserType[]> = {
            'super-admin': [],
            'admin': [],
            'domain-lead': [],
            'member': []
        };
        
        if(authorizedEmails.size === 0 && !isLoading) return groups;

        // Filter users to only include those whose emails are in the authorized list
        const visibleUsers = allUsers.filter(user => user.email && authorizedEmails.has(user.email));

        visibleUsers.forEach(user => {
            if (groups[user.role]) {
                groups[user.role].push(user);
            }
        });
        
        for(const role in groups) {
            groups[role].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        return groups;

    }, [allUsers, authorizedEmails, isLoading]);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const isSuperAdmin = currentUser?.role === 'super-admin';

    return (
        <div className="w-full h-full flex flex-col space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Users /> The Team</h1>
                    <p className="text-muted-foreground">Meet the members driving the club forward.</p>
                </div>
                {/* {isSuperAdmin && (
                    <div className="flex items-center space-x-2">
                        <Switch id="modify-mode" checked={isModifyMode} onCheckedChange={setIsModifyMode} />
                        <Label htmlFor="modify-mode">Modify</Label>
                    </div>
                )} */}
            </header>

            <div className="space-y-8 overflow-y-auto flex-1 pr-2 -mr-2">
                 <RoleSection title="Super Admins" users={filteredAndGroupedUsers['super-admin']} badgeClass="border-destructive text-destructive" isModifyMode={isModifyMode} onEdit={handleEditUser} />
                 <RoleSection title="Admins" users={filteredAndGroupedUsers['admin']} badgeClass="border-primary text-primary" isModifyMode={isModifyMode} onEdit={handleEditUser} />
                 <RoleSection title="Domain Leads" users={filteredAndGroupedUsers['domain-lead']} badgeClass="border-secondary-foreground" isModifyMode={isModifyMode} onEdit={handleEditUser} />
                 <MemberSection users={filteredAndGroupedUsers['member']} isModifyMode={isModifyMode} onEdit={handleEditUser} />
            </div>
        </div>
    )
}
