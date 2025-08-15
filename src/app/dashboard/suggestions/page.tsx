
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lightbulb, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Suggestion, User as UserType } from '@/lib/types';
import { logActivity } from '@/lib/logger';
import { SuggestionModal } from '@/components/dashboard/suggestion-modal';
import SuggestionCard from '@/components/dashboard/suggestion-card';

export default function SuggestionsPage() {
    const [currentUser, setCurrentUser] = React.useState<UserType | null>(null);
    const [allUsers, setAllUsers] = React.useState<UserType[]>([]);
    const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                const unsubUser = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        const userData = { id: user.uid, ...doc.data() } as UserType;
                        setCurrentUser(userData);
                    }
                });

                const usersQuery = query(collection(db, 'users'));
                const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
                    setAllUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserType)));
                });
                
                return () => {
                    unsubUser();
                    unsubUsers();
                }
            } else {
                setIsLoading(false);
            }
        });

        const suggestionsQuery = query(collection(db, 'suggestions'), orderBy('timestamp', 'desc'));
        const unsubscribeSuggestions = onSnapshot(suggestionsQuery, (snapshot) => {
            setSuggestions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Suggestion)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching suggestions:", error);
            toast({ variant: 'destructive', title: 'Failed to load suggestions.' });
            setIsLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeSuggestions();
        };
    }, [toast]);

    const handleCreateSuggestion = async (newSuggestionData: Omit<Suggestion, 'id' | 'submitter' | 'timestamp' | 'domain' | 'responses'>) => {
        if (!currentUser) return;
        
        try {
            const suggestionWithMeta: Omit<Suggestion, 'id'> = {
                ...newSuggestionData,
                submitter: currentUser,
                timestamp: new Date().toISOString(),
                domain: currentUser.domain || null,
                responses: [],
            };
            const docRef = await addDoc(collection(db, 'suggestions'), suggestionWithMeta);
            
            await fetch('/api/send-suggestion-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'new-suggestion',
                    suggestion: { ...suggestionWithMeta, id: docRef.id },
                    allUsers: allUsers,
                }),
            });

            toast({ title: "Suggestion Submitted!", description: "Thank you for your feedback." });
            await logActivity(`Submitted suggestion: "${newSuggestionData.title}"`, 'Suggestions', currentUser);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error creating suggestion:', error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: (error as Error).message });
            await logActivity(`Failed to submit suggestion: ${(error as Error).message}`, 'Error', currentUser);
        }
    };
    
    const handleUpdateSuggestion = async (suggestionId: string, updatedData: Partial<Suggestion>) => {
        try {
            const suggestionRef = doc(db, 'suggestions', suggestionId);
            await updateDoc(suggestionRef, updatedData);
            
            // If a response was added, send email notification
            if (updatedData.responses && currentUser) {
                const suggestion = suggestions.find(s => s.id === suggestionId);
                if (suggestion) {
                    await fetch('/api/send-suggestion-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'new-response',
                            suggestion: suggestion,
                            responder: currentUser
                        }),
                    });
                }
            }

            toast({ title: 'Suggestion Updated' });
        } catch (error) {
            console.error('Error updating suggestion:', error);
            toast({ variant: 'destructive', title: 'Update Failed', description: (error as Error).message });
        }
    }


    if (isLoading || !currentUser) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const canManageAll = currentUser.role === 'super-admin' || currentUser.role === 'admin';
    const isDomainLead = currentUser.role === 'domain-lead';
    
    const mySubmissions = suggestions.filter(s => s.submitter.id === currentUser.id);
    const teamSubmissions = isDomainLead ? suggestions.filter(s => s.domain === currentUser.domain && s.submitter.id !== currentUser.id) : [];

    const tabs = ['My Submissions'];
    if (isDomainLead) tabs.push('Team Feedback');
    if (canManageAll) tabs.push('All Feedback');

    return (
        <div className="w-full h-full flex flex-col space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Lightbulb /> Suggestions & Feedback</h1>
                    <p className="text-muted-foreground">Submit ideas, report bugs, and help improve the platform.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Submit Suggestion
                </Button>
            </header>
            
            <Tabs defaultValue={tabs[0]} className="flex-grow flex flex-col">
                <TabsList className="shrink-0">
                    {tabs.map(tab => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
                </TabsList>
                <TabsContent value="My Submissions" className="flex-grow overflow-y-auto mt-4 pr-2 -mr-2">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {mySubmissions.map(s => <SuggestionCard key={s.id} suggestion={s} currentUser={currentUser} onUpdate={handleUpdateSuggestion} allUsers={allUsers} />)}
                        {mySubmissions.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">You haven't submitted any feedback yet.</p>}
                    </div>
                </TabsContent>
                {isDomainLead && (
                    <TabsContent value="Team Feedback" className="flex-grow overflow-y-auto mt-4 pr-2 -mr-2">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {teamSubmissions.map(s => <SuggestionCard key={s.id} suggestion={s} currentUser={currentUser} onUpdate={handleUpdateSuggestion} allUsers={allUsers}/>)}
                            {teamSubmissions.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No feedback from your team members yet.</p>}
                        </div>
                    </TabsContent>
                )}
                {canManageAll && (
                    <TabsContent value="All Feedback" className="flex-grow overflow-y-auto mt-4 pr-2 -mr-2">
                       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {suggestions.map(s => <SuggestionCard key={s.id} suggestion={s} currentUser={currentUser} onUpdate={handleUpdateSuggestion} allUsers={allUsers} />)}
                            {suggestions.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No feedback has been submitted yet.</p>}
                        </div>
                    </TabsContent>
                )}
            </Tabs>
            
            <SuggestionModal
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                onSubmit={handleCreateSuggestion}
            />
        </div>
    );
}
