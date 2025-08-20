
'use client';
 
import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Upload, FolderPlus, BookOpen, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DocumentationItem, User } from '@/lib/types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import TreeNav from './tree-nav';
import ContentDisplay from './content-display';
import { CreateFolderModal } from './create-folder-modal';
import { UploadFileModal } from './upload-file-modal';
import { EditPermissionsModal } from './edit-permissions-modal';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';


export default function Documentation() {
    const [currentUser, setCurrentUser] = React.useState<User | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [items, setItems] = React.useState<DocumentationItem[]>([]);
    const [domains, setDomains] = React.useState<{id: string}[]>([]);
    const [isFolderModalOpen, setIsFolderModalOpen] = React.useState(false);
    const [isFileModalOpen, setIsFileModalOpen] = React.useState(false);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = React.useState(false);
    const [selectedItemForPermissions, setSelectedItemForPermissions] = React.useState<DocumentationItem | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isTreeNavOpen, setIsTreeNavOpen] = React.useState(false);

    const { toast } = useToast();
    const searchParams = useSearchParams();
    const currentFolderId = searchParams.get('folderId') || null;
    const isMobile = useIsMobile();


    React.useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setCurrentUser({ id: user.uid, ...userDoc.data() } as User);
                }
            } else {
                setCurrentUser(null);
            }
        });
        
        const domainsUnsub = onSnapshot(collection(db, 'domains'), (snapshot) => {
            setDomains(snapshot.docs.map(doc => ({ id: doc.id })));
        });

        return () => {
            unsubscribeAuth();
            domainsUnsub();
        };
    }, []);
    
     React.useEffect(() => {
        if (currentUser) {
            fetchItems();
        } else {
            // if user is not logged in after check, stop loading
            setIsLoading(false);
        }
    }, [currentUser]);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/documentation', {
                 headers: { 'x-user': JSON.stringify(currentUser) },
            });
            if (!response.ok) throw new Error('Failed to fetch documentation items.');
            const data = await response.json();
            setItems(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const canManage = currentUser?.role === 'super-admin' || (currentUser?.role === 'domain-lead' && currentUser?.domain === 'Documentation');

    const handleCreateFolder = async (name: string, viewableBy: string[]) => {
        setIsSubmitting(true);
        try {
             const response = await fetch('/api/documentation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user': JSON.stringify(currentUser) },
                body: JSON.stringify({ type: 'folder', name, parentId: currentFolderId, viewableBy }),
            });
            if (!response.ok) {
                 const res = await response.json();
                 throw new Error(res.error || "Failed to create folder.");
            }
            await fetchItems(); // Refresh list
            toast({ title: 'Success', description: 'Folder created successfully.' });
            setIsFolderModalOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleUploadFile = async (file: File, name: string, viewableBy: string[]) => {
        setIsSubmitting(true);
        // Step 1: Upload file to R2 via our /api/upload endpoint
        const formData = new FormData();
        formData.append('file', file);
         try {
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'X-Custom-Auth-Key': process.env.NEXT_PUBLIC_JWT_SECRET || '' },
                body: formData,
            });
            if (!uploadResponse.ok) {
                 const res = await uploadResponse.json();
                 throw new Error(res.error || 'File upload to storage failed');
            }
            const uploadResult = await uploadResponse.json();

            // Step 2: Create file metadata in Firestore via our /api/documentation endpoint
            const docResponse = await fetch('/api/documentation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user': JSON.stringify(currentUser) },
                body: JSON.stringify({
                    type: 'file',
                    name: name || file.name,
                    parentId: currentFolderId,
                    filePath: uploadResult.filePath,
                    mimeType: file.type,
                    viewableBy
                }),
            });
             if (!docResponse.ok) {
                const res = await docResponse.json();
                throw new Error(res.error || 'Failed to create file record.');
            }
             await fetchItems(); // Refresh list
             toast({ title: 'Success', description: 'File uploaded successfully.' });
             setIsFileModalOpen(false);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRename = async(id: string, newName: string, type: 'folder' | 'file') => {
        try {
            const response = await fetch('/api/documentation', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-user': JSON.stringify(currentUser) },
                body: JSON.stringify({ id, name: newName, type }),
            });
            if (!response.ok) throw new Error('Failed to rename item.');
            await fetchItems();
            toast({ title: 'Success', description: 'Item renamed successfully.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        }
    }
    
    const handleDelete = async (id: string, type: 'folder' | 'file') => {
        try {
            const response = await fetch(`/api/documentation?id=${id}&type=${type}`, {
                method: 'DELETE',
                headers: { 'x-user': JSON.stringify(currentUser) },
            });
            if (!response.ok) throw new Error('Failed to delete item.');
            await fetchItems();
            toast({ title: 'Success', description: 'Item deleted successfully.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        }
    };

    const handleEditPermissions = (item: DocumentationItem) => {
        setSelectedItemForPermissions(item);
        setIsPermissionsModalOpen(true);
    };

    const handleUpdatePermissions = async (itemId: string, viewableBy: string[]) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/documentation', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-user': JSON.stringify(currentUser) },
                body: JSON.stringify({ id: itemId, viewableBy }),
            });
            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || 'Failed to update permissions.');
            }
            await fetchItems();
            toast({ title: 'Success', description: 'Permissions updated successfully.' });
            setIsPermissionsModalOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };


    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const TreeNavContent = () => (
        <div className='p-4'>
            <h2 className="text-lg font-semibold mb-2 font-headline">Folders</h2>
            <TreeNav items={items} onLinkClick={() => setIsTreeNavOpen(false)} />
        </div>
    );

    return (
        <div className="flex h-full flex-col space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b gap-4">
                 <div className="flex items-center gap-2">
                    {isMobile && (
                         <Sheet open={isTreeNavOpen} onOpenChange={setIsTreeNavOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <PanelLeft className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-80 p-0">
                                <TreeNavContent />
                            </SheetContent>
                        </Sheet>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                            <BookOpen /> Documentation
                        </h1>
                        <p className="text-muted-foreground">Official documentation, resources, and project deliverables.</p>
                    </div>
                </div>
                {canManage && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsFolderModalOpen(true)}>
                            <FolderPlus className="mr-2 h-4 w-4" /> Create Folder
                        </Button>
                        <Button onClick={() => setIsFileModalOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" /> Upload File
                        </Button>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr] gap-6 flex-1 h-full overflow-hidden">
                <aside className="hidden md:flex flex-col border-r pr-6 overflow-y-auto">
                   <TreeNavContent/>
                </aside>
                <main className="overflow-y-auto h-full">
                    <ContentDisplay 
                        items={items} 
                        currentFolderId={currentFolderId} 
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onEditPermissions={handleEditPermissions}
                        canManage={canManage || false}
                    />
                </main>
            </div>
            
             <CreateFolderModal
                isOpen={isFolderModalOpen}
                setIsOpen={setIsFolderModalOpen}
                isSubmitting={isSubmitting}
                onSubmit={handleCreateFolder}
                domains={domains}
            />

            <UploadFileModal
                isOpen={isFileModalOpen}
                setIsOpen={setIsFileModalOpen}
                isSubmitting={isSubmitting}
                onSubmit={handleUploadFile}
                domains={domains}
            />

            {selectedItemForPermissions && (
                <EditPermissionsModal
                    isOpen={isPermissionsModalOpen}
                    setIsOpen={setIsPermissionsModalOpen}
                    isSubmitting={isSubmitting}
                    onSubmit={handleUpdatePermissions}
                    item={selectedItemForPermissions}
                    domains={domains}
                />
            )}
        </div>
    );
}
