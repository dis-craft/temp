 
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { Announcement, User, AnnouncementTarget } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';


const announcementSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters long."),
    content: z.string().min(10, "Content must be at least 10 characters long."),
    targets: z.array(z.string()).min(1, "At least one target audience is required."),
    status: z.enum(['draft', 'published']),
    attachment: z.any().optional(),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

interface AnnouncementModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onSubmit: (data: Omit<Announcement, 'id' | 'author' | 'createdAt' | 'sent' | 'publishAt'>, attachmentFile?: File) => Promise<void>;
    currentUser: User;
    announcement: Announcement | null;
    domains: { id: string }[];
}

export function AnnouncementModal({ isOpen, setIsOpen, onSubmit, currentUser, announcement, domains }: AnnouncementModalProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<AnnouncementFormValues>({
        resolver: zodResolver(announcementSchema),
        defaultValues: {
            title: '',
            content: '',
            targets: [],
            status: 'published',
            attachment: undefined,
        },
    });

    React.useEffect(() => {
        if (isOpen) {
            if (announcement) {
                form.reset({
                    title: announcement.title,
                    content: announcement.content,
                    targets: announcement.targets,
                    status: announcement.status === 'archived' ? 'draft' : announcement.status,
                    attachment: undefined, // Cannot pre-fill file input
                });
            } else {
                form.reset({
                    title: '',
                    content: '',
                    targets: [],
                    status: 'published',
                    attachment: undefined,
                });
            }
        }
    }, [isOpen, announcement, form]);

    const handleSubmit = async (data: AnnouncementFormValues) => {
        setIsSubmitting(true);
        const finalData = {
            title: data.title,
            content: data.content,
            targets: data.targets as AnnouncementTarget[],
            status: data.status,
        };
        const attachmentFile = data.attachment?.[0];
        await onSubmit(finalData, attachmentFile);
        setIsSubmitting(false);
    };

    const targetOptions = React.useMemo(() => {
        const options: { value: AnnouncementTarget, label: string, group: string }[] = [];
        const { role, domain } = currentUser;

        if (role === 'super-admin' || role === 'admin') {
            options.push({ value: 'all', label: 'Everyone', group: 'General' });
            options.push({ value: 'role-super-admin', label: 'Super Admins', group: 'Roles' });
            options.push({ value: 'role-admin', label: 'Admins', group: 'Roles' });
            options.push({ value: 'role-domain-lead', label: 'All Domain Leads', group: 'Roles' });
            options.push({ value: 'role-member', label: 'All Members', group: 'Roles' });
            domains.forEach(d => {
                options.push({ value: `domain-${d.id}`, label: `${d.id} Domain`, group: 'Domains'});
            });
        } else if (role === 'domain-lead' && domain) {
            options.push({ value: `domain-${domain}`, label: `${domain} Members`, group: 'My Domain' });
        }
        
        return options.sort((a,b) => a.label.localeCompare(b.label)).reduce((acc, option) => {
             if (!acc[option.group]) {
                acc[option.group] = [];
            }
            acc[option.group].push(option);
            return acc;
        }, {} as Record<string, { value: AnnouncementTarget, label: string, group: string }[]>);

    }, [currentUser, domains]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[600px] grid-rows-[auto,1fr,auto] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="font-headline">{announcement ? 'Edit' : 'Create'} Announcement</DialogTitle>
                    <DialogDescription>
                        Craft your message and choose who should see it.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 overflow-y-auto py-4 pr-2">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="E.g., Q3 Project Kick-off" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Content</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Write your announcement here..." className="min-h-[150px]" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="targets"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Audience</FormLabel>
                                    <ScrollArea className="h-40 w-full rounded-md border p-4">
                                         {Object.entries(targetOptions).map(([group, options], index) => (
                                            <div key={group}>
                                                {index > 0 && <Separator className="my-2" />}
                                                <h4 className="font-medium text-sm mb-2">{group}</h4>
                                                {options.map((option) => (
                                                    <FormField
                                                    key={option.value}
                                                    control={form.control}
                                                    name="targets"
                                                    render={({ field }) => (
                                                        <FormItem
                                                        key={option.value}
                                                        className="flex flex-row items-start space-x-3 space-y-0 mb-2"
                                                        >
                                                        <FormControl>
                                                            <Checkbox
                                                            checked={field.value?.includes(option.value)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                ? field.onChange([...field.value, option.value])
                                                                : field.onChange(
                                                                    field.value?.filter(
                                                                    (value) => value !== option.value
                                                                    )
                                                                )
                                                            }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal text-sm">
                                                            {option.label}
                                                        </FormLabel>
                                                        </FormItem>
                                                    )}
                                                    />
                                                ))}
                                            </div>
                                         ))}
                                    </ScrollArea>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                         <FormField
                          control={form.control}
                          name="attachment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Attach File (Optional)</FormLabel>
                              <FormControl>
                                <Input type="file" {...form.register('attachment')} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <DialogFooter className="sticky bottom-0 bg-background pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {announcement ? 'Save Changes' : 'Create Announcement'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
