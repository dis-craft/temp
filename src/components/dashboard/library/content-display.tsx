
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Folder, FileText, MoreVertical, Edit, Trash2, Download, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
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
import { Input } from '@/components/ui/input';
import type { DocumentationItem, DocumentationFile, User } from '@/lib/types';
import { findPath, formatUserName } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


interface ContentDisplayProps {
    items: DocumentationItem[];
    currentFolderId: string | null;
    canManage: boolean;
    onRename: (id: string, newName: string, type: 'folder' | 'file') => void;
    onDelete: (id: string, type: 'folder' | 'file') => void;
    onEditPermissions: (item: DocumentationItem) => void;
}

export default function ContentDisplay({ items, currentFolderId, canManage, onRename, onDelete, onEditPermissions }: ContentDisplayProps) {
    const [renamingItem, setRenamingItem] = React.useState<DocumentationItem | null>(null);
    const [newName, setNewName] = React.useState('');
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentItems = items
        .filter(item => item.parentId === currentFolderId)
        .sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });

    const path = findPath(items, currentFolderId);
    
    const createQueryString = (name: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(name, value);
        return params.toString();
    };

    const handleDownload = async (fileKey?: string) => {
        if (!fileKey) return;
        const downloadUrl = `/api/download/${fileKey}`;
        window.open(downloadUrl, '_blank');
    };

    const handleRenameClick = (item: DocumentationItem) => {
        setRenamingItem(item);
        setNewName(item.name);
    }
    
    const handleRenameSubmit = () => {
        if (!renamingItem || !newName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Name cannot be empty.' });
            return;
        }
        onRename(renamingItem.id, newName.trim(), renamingItem.type);
        setRenamingItem(null);
        setNewName('');
    }

    return (
        <div>
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                           <Link href="/dashboard/library">Library</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    {path.map((item, index) => (
                        <React.Fragment key={item.id}>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {index === path.length - 1 ? (
                                    <BreadcrumbPage>{item.name}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={`/dashboard/library?${createQueryString('folderId', item.id)}`}>{item.name}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </React.Fragment>
                    ))}
                </BreadcrumbList>
            </Breadcrumb>
            
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="hidden sm:table-cell">Owner</TableHead>
                            <TableHead className="hidden md:table-cell">Date Added</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentItems.length > 0 ? (
                            currentItems.map(item => (
                                <TableRow key={item.id} className="cursor-pointer" onDoubleClick={() => {
                                    if(item.type === 'folder') {
                                       router.push(`/dashboard/library?${createQueryString('folderId', item.id)}`)
                                    } else {
                                        handleDownload((item as DocumentationFile).filePath);
                                    }
                                }}>
                                    <TableCell>
                                        {renamingItem?.id === item.id ? (
                                            <div className="flex gap-2 items-center">
                                                <Input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()} />
                                                <Button size="sm" onClick={handleRenameSubmit}>Save</Button>
                                                <Button size="sm" variant="ghost" onClick={() => setRenamingItem(null)}>Cancel</Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 font-medium">
                                                {item.type === 'folder' ? <Folder className="h-5 w-5 text-blue-500" /> : <FileText className="h-5 w-5 text-gray-500" />}
                                                {item.name}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground">{formatUserName(item.createdBy)}</TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">{format(new Date(item.createdAt), 'PP')}</TableCell>
                                    <TableCell className="text-right">
                                       {item.type === 'file' && (
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDownload((item as DocumentationFile).filePath); }}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {canManage && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleRenameClick(item) }}>
                                                        <Edit className="mr-2 h-4 w-4" /> Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => {e.stopPropagation(); onEditPermissions(item)}}>
                                                        <Shield className="mr-2 h-4 w-4" /> Edit Permissions
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                          </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                            <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the {item.type} "{item.name}"{item.type === 'folder' && " and all its contents"}.
                                                            </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onDelete(item.id, item.type)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    This folder is empty.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
