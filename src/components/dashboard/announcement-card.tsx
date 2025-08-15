
'use client';

import * as React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Edit, Trash2, Globe, Users, Shield, Building, Paperclip, Download } from 'lucide-react';
import type { Announcement, User } from '@/lib/types';
import { cn, formatUserName } from '@/lib/utils';


interface AnnouncementCardProps {
    announcement: Announcement;
    currentUser: User;
    allUsers: User[];
    onEdit: () => void;
    onDelete: () => void;
}

const statusColors: Record<Announcement['status'], string> = {
    'draft': 'bg-gray-100 text-gray-800 border-gray-300',
    'published': 'bg-green-100 text-green-800 border-green-300',
    'archived': 'bg-zinc-200 text-zinc-800 border-zinc-400',
};

const getTargetInfo = (target: string) => {
    if (target === 'all') return { icon: Globe, label: 'Everyone' };
    const [type, value] = target.split('-');
    if (type === 'role') {
        const icon = value === 'admin' || value === 'super-admin' ? Shield : Users;
        return { icon, label: `${value.charAt(0).toUpperCase() + value.slice(1)}s`};
    }
    if (type === 'domain') return { icon: Building, label: `${value} Domain`};
    return { icon: Users, label: target };
}


export default function AnnouncementCard({ announcement, currentUser, allUsers, onEdit, onDelete }: AnnouncementCardProps) {

    const canManage = currentUser.role === 'super-admin' || currentUser.role === 'admin' || announcement.author.id === currentUser.id;

    const handleDownload = async (fileKey?: string) => {
        if (!fileKey) return;
        const downloadUrl = `/api/download/${fileKey}`;
        window.open(downloadUrl, '_blank');
    };

    return (
        <Card className="flex flex-col h-full shadow-sm">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="font-headline text-lg leading-tight pr-4">{announcement.title}</CardTitle>
                    {canManage && (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onEdit}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator/>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete this announcement.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={onDelete}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                 <CardDescription className="text-xs pt-1 flex items-center gap-2">
                     <Avatar className="h-5 w-5">
                        <AvatarImage src={announcement.author.avatarUrl || undefined} />
                        <AvatarFallback>{announcement.author.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{formatUserName(announcement.author, allUsers)}</span>
                    <span className="font-semibold text-gray-500">&middot;</span>
                    <span title={format(new Date(announcement.publishAt), 'PPpp')}>
                        Published {formatDistanceToNow(new Date(announcement.publishAt), { addSuffix: true })}
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                {announcement.attachment && (
                    <Button variant="outline" size="sm" onClick={() => handleDownload(announcement.attachment)}>
                        <Download className="mr-2 h-4 w-4"/>
                        Download Attachment
                    </Button>
                )}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2">
                <Separator className="my-2" />
                 <div className="flex items-center gap-4 w-full justify-between">
                     <div>
                        <span className="text-xs font-semibold text-muted-foreground">Audience</span>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                            {announcement.targets.map(target => {
                                const { icon: Icon, label } = getTargetInfo(target);
                                return (
                                    <Badge key={target} variant="secondary" className="gap-1.5 font-normal">
                                        <Icon className="h-3 w-3" />
                                        {label}
                                    </Badge>
                                );
                            })}
                        </div>
                     </div>
                      <Badge variant="outline" className={cn(statusColors[announcement.status])}>{announcement.status}</Badge>
                </div>
            </CardFooter>
        </Card>
    );
}
