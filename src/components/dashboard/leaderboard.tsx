
'use client';

import * as React from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, Medal, Star, Shield, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { Task, User as UserType } from '@/lib/types';
import { formatUserName } from '@/lib/utils';
import { Badge } from '../ui/badge';


const StarRatingDisplay = ({ rating }: { rating: number }) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
        <div className="flex items-center">
            {[...Array(fullStars)].map((_, i) => <Star key={`full-${i}`} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}
            {/* Not implementing half star for simplicity, can be added later */}
            {[...Array(emptyStars + (halfStar ? 1 : 0))].map((_, i) => <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />)}
        </div>
    );
};


export default function Leaderboard() {
    const [currentUser, setCurrentUser] = React.useState<UserType | null>(null);
    const [allUsers, setAllUsers] = React.useState<UserType[]>([]);
    const [tasks, setTasks] = React.useState<Task[]>([]);
    const [domains, setDomains] = React.useState<{ id: string }[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [leaderboardType, setLeaderboardType] = React.useState<'members' | 'leads'>('members');
    const [domainFilter, setDomainFilter] = React.useState<string>('all');
    
    const { toast } = useToast();

    React.useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        setCurrentUser({ id: user.uid, ...doc.data() } as UserType);
                    }
                });
            }
        });

        const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserType)));
        });

        const tasksUnsub = onSnapshot(collection(db, 'tasks'), (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
            setIsLoading(false);
        }, (error) => {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error loading data' });
            setIsLoading(false);
        });
        
        const domainsUnsub = onSnapshot(collection(db, 'domains'), (snapshot) => {
            setDomains(snapshot.docs.map(doc => ({ id: doc.id })));
        });

        return () => {
            unsubscribeAuth();
            usersUnsub();
            tasksUnsub();
            domainsUnsub();
        };
    }, [toast]);
    
    const leaderboardData = React.useMemo(() => {
        const userRatings: { [userId: string]: { totalScore: number; count: number } } = {};

        if (leaderboardType === 'members') {
            tasks.forEach(task => {
                task.submissions.forEach(sub => {
                    if (sub.qualityScore && sub.qualityScore > 0) {
                        if (!userRatings[sub.author.id]) {
                            userRatings[sub.author.id] = { totalScore: 0, count: 0 };
                        }
                        userRatings[sub.author.id].totalScore += sub.qualityScore;
                        userRatings[sub.author.id].count += 1;
                    }
                });
            });
        } else { // leads
            tasks.forEach(task => {
                if (task.assignedToLead && task.submissions.length > 0) {
                     const avgTaskScore = task.submissions.reduce((acc, sub) => acc + (sub.qualityScore || 0), 0) / task.submissions.length;
                     if(avgTaskScore > 0) {
                        if (!userRatings[task.assignedToLead.id]) {
                            userRatings[task.assignedToLead.id] = { totalScore: 0, count: 0 };
                        }
                        userRatings[task.assignedToLead.id].totalScore += avgTaskScore;
                        userRatings[task.assignedToLead.id].count += 1;
                     }
                }
            });
        }

        const rankedUsers = Object.keys(userRatings)
            .map(userId => {
                const user = allUsers.find(u => u.id === userId);
                if (!user) return null;
                if (leaderboardType === 'members' && user.role !== 'member') return null;
                if (leaderboardType === 'leads' && user.role !== 'domain-lead') return null;

                const data = userRatings[userId];
                const average = data.count > 0 ? data.totalScore / data.count : 0;
                return {
                    ...user,
                    averageRating: average,
                    tasksRated: data.count,
                };
            })
            .filter(Boolean)
            .sort((a, b) => (b?.averageRating || 0) - (a?.averageRating || 0));
        
        if (domainFilter !== 'all') {
            return rankedUsers.filter(u => u?.domain === domainFilter);
        }

        return rankedUsers;
    }, [tasks, allUsers, leaderboardType, domainFilter]);
    
    const topThree = leaderboardData.slice(0, 3);
    const restOfBoard = leaderboardData.slice(3);
    const canViewLeadsBoard = currentUser?.role === 'super-admin' || currentUser?.role === 'admin' || currentUser?.role === 'domain-lead';

    if (isLoading || !currentUser) {
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
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Trophy /> Leaderboard</h1>
                    <p className="text-muted-foreground">Recognizing top performers based on task quality ratings.</p>
                </div>
                <Select value={domainFilter} onValueChange={setDomainFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by domain..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Domains</SelectItem>
                        {domains.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.id}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </header>
            
            <Tabs value={leaderboardType} onValueChange={(v) => setLeaderboardType(v as any)} className="w-full">
                {canViewLeadsBoard && (
                     <TabsList>
                        <TabsTrigger value="members"><Users className="mr-2 h-4 w-4"/>Members</TabsTrigger>
                        <TabsTrigger value="leads"><Shield className="mr-2 h-4 w-4"/>Domain Leads</TabsTrigger>
                    </TabsList>
                )}
                <TabsContent value={leaderboardType}>
                    {leaderboardData.length > 0 ? (
                        <div className="space-y-8 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            {/* Second Place */}
                            {topThree[1] && (
                            <Card className="relative order-2 text-center p-4 border-2 border-gray-300">
                                <Medal className="h-10 w-10 text-gray-400 mx-auto" />
                                <Avatar className="h-20 w-20 mx-auto my-2 border-4 border-gray-300">
                                <AvatarImage src={topThree[1].avatarUrl || ''} />
                                <AvatarFallback>{topThree[1].name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <h3 className="font-bold text-lg">{formatUserName(topThree[1], allUsers)}</h3>
                                <p className="text-muted-foreground text-sm">{topThree[1].domain}</p>
                                <StarRatingDisplay rating={topThree[1].averageRating} />
                            </Card>
                            )}
                            {/* First Place */}
                             {topThree[0] && (
                            <Card className="relative order-1 md:-mb-8 text-center p-6 border-2 border-yellow-400">
                                <Medal className="h-12 w-12 text-yellow-500 mx-auto" />
                                <Avatar className="h-24 w-24 mx-auto my-2 border-4 border-yellow-400">
                                <AvatarImage src={topThree[0].avatarUrl || ''} />
                                <AvatarFallback>{topThree[0].name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <h3 className="font-bold text-xl">{formatUserName(topThree[0], allUsers)}</h3>
                                <p className="text-muted-foreground text-sm">{topThree[0].domain}</p>
                                <StarRatingDisplay rating={topThree[0].averageRating} />
                            </Card>
                            )}
                            {/* Third Place */}
                            {topThree[2] && (
                            <Card className="relative order-3 text-center p-4 border-2 border-orange-400">
                                <Medal className="h-10 w-10 text-orange-500 mx-auto" />
                                <Avatar className="h-20 w-20 mx-auto my-2 border-4 border-orange-400">
                                <AvatarImage src={topThree[2].avatarUrl || ''} />
                                <AvatarFallback>{topThree[2].name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <h3 className="font-bold text-lg">{formatUserName(topThree[2], allUsers)}</h3>
                                <p className="text-muted-foreground text-sm">{topThree[2].domain}</p>
                                <StarRatingDisplay rating={topThree[2].averageRating} />
                            </Card>
                            )}
                        </div>

                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead className="w-[50px]">Rank</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Domain</TableHead>
                                    <TableHead>Avg. Rating</TableHead>
                                    <TableHead className="text-right">Tasks Rated</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {restOfBoard.map((user, index) => (
                                    user && <TableRow key={user.id}>
                                        <TableCell className="font-bold text-lg">{index + 4}</TableCell>
                                        <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.avatarUrl || ''} />
                                                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{formatUserName(user, allUsers)}</span>
                                        </div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{user.domain || 'N/A'}</Badge></TableCell>
                                        <TableCell><StarRatingDisplay rating={user.averageRating} /></TableCell>
                                        <TableCell className="text-right">{user.tasksRated}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            <p>No rated tasks found for this category or filter.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
