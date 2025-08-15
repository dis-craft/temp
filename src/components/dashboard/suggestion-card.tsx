
'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown, MessageSquare, Send, UserCircle } from 'lucide-react';
import type { Suggestion, SuggestionStatus, User, SuggestionResponse } from '@/lib/types';
import { cn, formatUserName } from '@/lib/utils';
import { logActivity } from '@/lib/logger';

interface SuggestionCardProps {
    suggestion: Suggestion;
    currentUser: User;
    allUsers: User[];
    onUpdate: (suggestionId: string, updatedData: Partial<Suggestion>) => void;
}

const priorityColors: Record<Suggestion['priority'], string> = {
    'Low': 'bg-blue-100 text-blue-800 border-blue-300',
    'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'High': 'bg-orange-100 text-orange-800 border-orange-300',
    'Urgent': 'bg-red-100 text-red-800 border-red-300',
};

const statusColors: Record<Suggestion['status'], string> = {
    'Open': 'bg-gray-100 text-gray-800 border-gray-300',
    'In Progress': 'bg-purple-100 text-purple-800 border-purple-300',
    'Resolved': 'bg-green-100 text-green-800 border-green-300',
    'Closed': 'bg-zinc-200 text-zinc-800 border-zinc-400',
};

const statuses: SuggestionStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function SuggestionCard({ suggestion, currentUser, allUsers, onUpdate }: SuggestionCardProps) {
    const [response, setResponse] = React.useState('');
    const [isResponding, setIsResponding] = React.useState(false);

    const canManage = currentUser.role === 'super-admin' || currentUser.role === 'admin' ||
        (currentUser.role === 'domain-lead' && currentUser.domain === suggestion.domain);
    
    const submitterName = suggestion.isAnonymous ? 'Anonymous' : formatUserName(suggestion.submitter, allUsers);

    const handleStatusChange = (newStatus: SuggestionStatus) => {
        onUpdate(suggestion.id, { status: newStatus });
        logActivity(`Changed status of suggestion "${suggestion.title}" to ${newStatus}`, 'Suggestions', currentUser);
    };

    const handlePostResponse = () => {
        if (!response.trim() || !currentUser) return;
        
        const newResponse: SuggestionResponse = {
            id: `resp-${Date.now()}`,
            author: currentUser,
            text: response,
            timestamp: new Date().toISOString(),
        };
        
        const updatedResponses = [...suggestion.responses, newResponse];
        onUpdate(suggestion.id, { responses: updatedResponses });
        logActivity(`Responded to suggestion: "${suggestion.title}"`, 'Suggestions', currentUser);
        setResponse('');
        setIsResponding(false);
    };

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="font-headline text-base leading-tight pr-4">{suggestion.title}</CardTitle>
                    {canManage ? (
                         <Select defaultValue={suggestion.status} onValueChange={handleStatusChange}>
                            <SelectTrigger className={cn("w-[140px] h-8 text-xs", statusColors[suggestion.status])}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge variant="outline" className={cn(statusColors[suggestion.status])}>{suggestion.status}</Badge>
                    )}
                </div>
                <div className="text-xs text-muted-foreground pt-1 flex items-center gap-2">
                     {suggestion.isAnonymous ? <UserCircle className="h-4 w-4" /> : 
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={suggestion.submitter.avatarUrl || undefined} />
                            <AvatarFallback>{suggestion.submitter.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                     }
                    <span>{submitterName}</span>
                    <span className="font-semibold text-gray-500">&middot;</span>
                    <span>{formatDistanceToNow(new Date(suggestion.timestamp), { addSuffix: true })}</span>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{suggestion.description}</p>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                     <Badge variant="outline">{suggestion.category}</Badge>
                     <Badge variant="outline" className={cn(priorityColors[suggestion.priority])}>{suggestion.priority}</Badge>
                </div>
                <Separator className="my-2" />
                <Collapsible className="w-full space-y-2">
                    <CollapsibleTrigger asChild>
                       <Button variant="ghost" size="sm" className="w-full justify-between">
                            <span>
                                {suggestion.responses.length > 0 
                                ? `${suggestion.responses.length} Response(s)` 
                                : 'No Responses Yet'}
                            </span>
                             <div className="flex items-center gap-2">
                                {(canManage || suggestion.submitter.id === currentUser.id) && !isResponding && (
                                    <span className="text-xs text-primary hover:underline" onClick={(e) => {e.stopPropagation(); setIsResponding(true);}}>
                                        {canManage ? "Respond" : "View"}
                                    </span>
                                )}
                                <ChevronsUpDown className="h-4 w-4" />
                             </div>
                       </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 px-2">
                        {suggestion.responses.length > 0 ? suggestion.responses.map(resp => (
                            <div key={resp.id} className="flex items-start space-x-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={resp.author.avatarUrl || undefined} />
                                    <AvatarFallback>{resp.author.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-xs">
                                    <div className="font-semibold">{formatUserName(resp.author, allUsers)} <span className="text-muted-foreground font-normal ml-1">{formatDistanceToNow(new Date(resp.timestamp), { addSuffix: true })}</span></div>
                                    <p className="text-muted-foreground bg-secondary p-2 rounded-md mt-1">{resp.text}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-xs text-muted-foreground text-center py-2">No responses yet. {canManage && "Be the first to respond!"}</p>
                        )}

                        {canManage && isResponding && (
                             <div className="flex items-start space-x-2 pt-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={currentUser.avatarUrl || undefined} />
                                    <AvatarFallback>{currentUser.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <Textarea 
                                        placeholder="Write a response..." 
                                        className="mb-2 text-xs"
                                        value={response}
                                        onChange={(e) => setResponse(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={handlePostResponse}><Send className="mr-1 h-3 w-3"/> Post</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setIsResponding(false)}>Cancel</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CollapsibleContent>
                </Collapsible>
            </CardFooter>
        </Card>
    );
}
