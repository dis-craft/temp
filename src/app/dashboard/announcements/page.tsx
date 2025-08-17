/**
 * @fileoverview Announcements Page Component.
 * @description This is a frontend (FE) file that renders the main page for the Announcements feature.
 * It's a client-side component ('use client') that handles real-time data fetching, state management,
 * and user interactions for announcements.
 *
 * How it works:
 * - It uses `onAuthStateChanged` to get the current authenticated user.
 * - It sets up real-time listeners (`onSnapshot`) with Firestore to fetch users, domains, and announcements.
 * - Announcements are filtered on the client-side to ensure users only see what's targeted to them
 *   (based on role, domain, or 'all').
 * - It provides the logic for creating, updating, and deleting announcements by calling the
 *   `/api/announcements` and `/api/send-announcement-email` API routes.
 * - File uploads for attachments are handled by calling the `/api/upload` route.
 *
 * Linked Files:
 * - `src/lib/firebase.ts`: For authentication and Firestore database access.
 * - `src/lib/types.ts`: Imports type definitions.
 * - `src/hooks/use-toast.ts`: For displaying notifications to the user.
 * - `src/components/dashboard/announcement-card.tsx`: Renders each individual announcement.
 * - `src/components/dashboard/announcement-modal.tsx`: The modal for creating/editing announcements.
 * - `/api/announcements/route.ts`: API for CRUD operations.
 * - `/api/send-announcement-email/route.ts`: API for sending notification emails.
 * - `/api/upload/route.ts`: API for handling file attachments.
 *
 * Tech Used:
 * - React: For building the UI.
 * - Next.js: As the application framework.
 * - Firebase SDK: For real-time database listeners and authentication.
 * - ShadCN UI: For UI components like Button, Card, Modal (Dialog).
 * - Lucide-React: For icons.
 */
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Megaphone, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Announcement, User as UserType } from '@/lib/types';
import { logActivity } from '@/lib/logger';
import AnnouncementCard from '@/components/dashboard/announcement-card';
import { AnnouncementModal } from '@/components/dashboard/announcement-modal';

export default function AnnouncementsPage() {
    const [currentUser, setCurrentUser] = React.useState<UserType | null>(null);
    const [allUsers, setAllUsers] = React.useState<UserType[]>([]);
    const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
    const [domains, setDomains] = React.useState<{id: string}[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = React.useState<Announcement | null>(null);

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

        const usersQuery = query(collection(db, 'users'));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserType)));
        });

        const domainsUnsub = onSnapshot(collection(db, 'domains'), (snapshot) => {
            setDomains(snapshot.docs.map(d => ({id: d.id})));
        });

        return () => { unsubscribeAuth(); unsubscribeUsers(); domainsUnsub(); };
    }, []);
    
    React.useEffect(() => {
        if (!currentUser) return;
        
        // Fetch announcements tailored to the user
        const announcementsQuery = query(collection(db, 'announcements'), orderBy('publishAt', 'desc'));
        const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
            const allAnnouncements = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Announcement));
            
            const now = new Date();
            const visibleAnnouncements = allAnnouncements.filter(a => {
                const publishDate = new Date(a.publishAt);
                if (a.status !== 'published' || publishDate > now) return false;

                // Admins and super-admins see all published announcements
                if (currentUser.role === 'super-admin' || currentUser.role === 'admin') return true;

                if (a.targets.includes('all')) return true;
                if (a.targets.includes(`role-${currentUser.role}`)) return true;
                if (currentUser.domain && a.targets.includes(`domain-${currentUser.domain}`)) return true;
                
                return false;
            });
            
            setAnnouncements(visibleAnnouncements);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching announcements:", error);
            toast({ variant: 'destructive', title: 'Failed to load announcements.' });
            setIsLoading(false);
        });

        return () => unsubscribeAnnouncements();
    }, [currentUser, toast]);

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'X-Custom-Auth-Key': process.env.NEXT_PUBLIC_JWT_SECRET || '' },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'File upload failed');
            }

            const result = await response.json();
            return result.filePath;
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: (error as Error).message,
            });
            return null;
        }
    };


    const handleUpsertAnnouncement = async (data: Omit<Announcement, 'id' | 'author' | 'createdAt' | 'sent' | 'publishAt'>, attachmentFile?: File) => {
        if (!currentUser) return;
        
        try {
            let attachmentPath = editingAnnouncement?.attachment || '';
            if (attachmentFile) {
                const uploadedPath = await uploadFile(attachmentFile);
                if (!uploadedPath) return; // Stop if upload fails
                attachmentPath = uploadedPath;
            }

            const publishAt = new Date().toISOString();
            
            let finalAnnouncementData;

            if (editingAnnouncement) {
                // Update
                const annRef = doc(db, 'announcements', editingAnnouncement.id);
                const updatedData = { ...data, attachment: attachmentPath, sent: false }; // Reset sent status on update
                await updateDoc(annRef, updatedData);
                
                finalAnnouncementData = { ...updatedData, id: editingAnnouncement.id, author: currentUser, createdAt: editingAnnouncement.createdAt, publishAt: publishAt };

                toast({ title: 'Announcement Updated', description: 'The announcement has been successfully updated.' });
                await logActivity(`Updated announcement: "${data.title}"`, 'Announcements', currentUser);
                
            } else {
                // Create
                const announcementWithMeta: Omit<Announcement, 'id'> = {
                    ...data,
                    author: currentUser,
                    createdAt: new Date().toISOString(),
                    publishAt,
                    attachment: attachmentPath,
                    sent: false,
                };
                const docRef = await addDoc(collection(db, 'announcements'), announcementWithMeta);
                finalAnnouncementData = { ...announcementWithMeta, id: docRef.id };
                toast({ title: 'Announcement Created', description: 'The announcement has been published.' });
                await logActivity(`Created announcement: "${data.title}"`, 'Announcements', currentUser);
            }
            
            // This is a simplified notification trigger. A real-world scenario would use a scheduled function.
            if (finalAnnouncementData.status === 'published') {
                 await fetch('/api/send-announcement-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ announcement: finalAnnouncementData }),
                });
            }


            setIsModalOpen(false);
            setEditingAnnouncement(null);
        } catch (error) {
            console.error('Error upserting announcement:', error);
            toast({ variant: 'destructive', title: 'Operation Failed', description: (error as Error).message });
        }
    };
    
    const handleDeleteAnnouncement = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'announcements', id));
            toast({ title: 'Announcement Deleted' });
            await logActivity(`Deleted announcement (ID: ${id})`, 'Announcements', currentUser);
        } catch (error) {
             console.error('Error deleting announcement:', error);
            toast({ variant: 'destructive', title: 'Delete Failed', description: (error as Error).message });
        }
    }
    
    const handleEditClick = (announcement: Announcement) => {
        setEditingAnnouncement(announcement);
        setIsModalOpen(true);
    };
    
    const handleCreateClick = () => {
        setEditingAnnouncement(null);
        setIsModalOpen(true);
    }
    
    const canCreate = currentUser?.role === 'super-admin' || currentUser?.role === 'admin' || currentUser?.role === 'domain-lead';

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
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Megaphone /> Announcements</h1>
                    <p className="text-muted-foreground">Stay up to date with the latest news and updates.</p>
                </div>
                {canCreate && (
                    <Button onClick={handleCreateClick}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Announcement
                    </Button>
                )}
            </header>
            
            <div className="flex-grow overflow-y-auto mt-4 pr-2 -mr-2">
                 <div className="space-y-4">
                    {announcements.map(a => 
                        <AnnouncementCard 
                            key={a.id} 
                            announcement={a} 
                            currentUser={currentUser} 
                            onEdit={() => handleEditClick(a)}
                            onDelete={() => handleDeleteAnnouncement(a.id)}
                            allUsers={allUsers}
                        />
                    )}
                    {announcements.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No announcements for you right now.</p>}
                </div>
            </div>
            
            <AnnouncementModal
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                onSubmit={handleUpsertAnnouncement}
                currentUser={currentUser}
                announcement={editingAnnouncement}
                domains={domains}
            />
        </div>
    );
}
