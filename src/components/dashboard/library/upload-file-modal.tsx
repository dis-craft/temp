
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Upload } from 'lucide-react';

const fileSchema = z.object({
    name: z.string().min(1, "File name cannot be empty."),
    file: z.instanceof(FileList).refine(files => files?.length === 1, "A file is required."),
});

type FileFormValues = z.infer<typeof fileSchema>;

interface UploadFileModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isSubmitting: boolean;
    onSubmit: (file: File, name: string) => Promise<void>;
}

export function UploadFileModal({ isOpen, setIsOpen, isSubmitting, onSubmit }: UploadFileModalProps) {
    const form = useForm<FileFormValues>({
        resolver: zodResolver(fileSchema),
        defaultValues: { name: '', file: undefined },
    });
    
    const fileRef = form.register("file");

    const handleSubmit = async (data: FileFormValues) => {
        if (data.file) {
            await onSubmit(data.file[0], data.name);
             if (!isSubmitting) {
                form.reset();
            }
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
                    <DialogTitle className="font-headline flex items-center gap-2"><Upload /> Upload a File</DialogTitle>
                    <DialogDescription>Select a file and give it a descriptive name.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 pt-4">
                         <FormField
                            control={form.control}
                            name="file"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>File</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="file" 
                                            {...fileRef}
                                            onChange={(e) => {
                                                field.onChange(e.target.files);
                                                if (e.target.files && e.target.files.length > 0) {
                                                    form.setValue("name", e.target.files[0].name);
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>File Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 'Final Report Q2'" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Upload
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
