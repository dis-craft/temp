
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, FolderPlus } from 'lucide-react';

const folderSchema = z.object({
    name: z.string().min(1, "Folder name cannot be empty."),
});

type FolderFormValues = z.infer<typeof folderSchema>;

interface CreateFolderModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isSubmitting: boolean;
    onSubmit: (name: string) => Promise<void>;
}

export function CreateFolderModal({ isOpen, setIsOpen, isSubmitting, onSubmit }: CreateFolderModalProps) {
    const form = useForm<FolderFormValues>({
        resolver: zodResolver(folderSchema),
        defaultValues: { name: '' },
    });

    const handleSubmit = async (data: FolderFormValues) => {
        await onSubmit(data.name);
        if (!isSubmitting) { // Don't reset if submission is ongoing, wait for parent to close
            form.reset();
        }
    };
    
    React.useEffect(() => {
        if(isOpen) {
            form.reset();
        }
    }, [isOpen, form]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2"><FolderPlus /> Create New Folder</DialogTitle>
                    <DialogDescription>Enter a name for your new folder. Click create when you're done.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Folder Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 'Project Alpha Deliverables'" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Folder
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
