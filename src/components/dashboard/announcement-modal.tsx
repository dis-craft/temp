
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Check, ChevronsUpDown, Calendar as CalendarIcon } from 'lucide-react';
import type { Announcement, User, AnnouncementTarget } from '@/lib/types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';


const announcementSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters long."),
    content: z.string().min(10, "Content must be at least 10 characters long."),
    targets: z.array(z.string()).min(1, "At least one target audience is required."),
    status: z.enum(['draft', 'published']),
    publishType: z.enum(['now', 'later']),
    publishAt: z.date(),
}).refine(data => {
    if (data.publishType === 'later') {
        return data.publishAt > new Date();
    }
    return true;
}, {
    message: "Scheduled publish date must be in the future.",
    path: ["publishAt"],
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

interface AnnouncementModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onSubmit: (data: Omit<Announcement, 'id' | 'author' | 'createdAt' | 'sent'>) => Promise<void>;
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
            publishType: 'now',
            publishAt: new Date(),
        },
    });

    React.useEffect(() => {
        if (isOpen) {
            if (announcement) {
                const publishDate = new Date(announcement.publishAt);
                const isScheduled = publishDate > new Date();
                form.reset({
                    title: announcement.title,
                    content: announcement.content,
                    targets: announcement.targets,
                    status: announcement.status === 'archived' ? 'draft' : announcement.status,
                    publishType: isScheduled ? 'later' : 'now',
                    publishAt: publishDate,
                });
            } else {
                form.reset({
                    title: '',
                    content: '',
                    targets: [],
                    status: 'published',
                    publishType: 'now',
                    publishAt: new Date(),
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
            publishAt: data.publishType === 'now' ? new Date().toISOString() : data.publishAt.toISOString(),
        };
        await onSubmit(finalData);
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
        }, {} as Record<string, typeof options>);

    }, [currentUser, domains]);

    const publishType = form.watch('publishType');

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">{announcement ? 'Edit' : 'Create'} Announcement</DialogTitle>
                    <DialogDescription>
                        Craft your message and choose who should see it. You can save as a draft or publish immediately.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
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
                                        <Textarea placeholder="Write your announcement here. Markdown is supported." className="min-h-[150px]" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="targets"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Audience</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn("w-full justify-between h-auto min-h-10", !field.value && "text-muted-foreground")}
                                        >
                                            <div className="flex gap-1 flex-wrap">
                                                {field.value && field.value.length > 0 ? field.value.map(val => (
                                                    <Badge key={val} variant="secondary">{Object.values(targetOptions).flat().find(o => o.value === val)?.label || val}</Badge>
                                                )) : "Select audience..."}
                                            </div>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search audience..." />
                                        <CommandEmpty>No audience found.</CommandEmpty>
                                            {Object.entries(targetOptions).map(([group, options]) => (
                                                 <CommandGroup key={group} heading={group}>
                                                    {options.map((option) => (
                                                        <CommandItem
                                                            value={option.label}
                                                            key={option.value}
                                                            onSelect={() => {
                                                                const newValue = field.value?.includes(option.value)
                                                                    ? field.value.filter(v => v !== option.value)
                                                                    : [...(field.value || []), option.value];
                                                                field.onChange(newValue);
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", field.value?.includes(option.value) ? "opacity-100" : "opacity-0")}/>
                                                            {option.label}
                                                        </CommandItem>
                                                    ))}
                                                 </CommandGroup>
                                            ))}
                                    </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                         <FormField
                            control={form.control}
                            name="publishType"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Publish Options</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-1"
                                    >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="now" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        Publish Now
                                        </FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="later" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        Schedule for Later
                                        </FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />

                        {publishType === 'later' && (
                             <FormField
                                control={form.control}
                                name="publishAt"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Publish Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn("w-[240px] pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                                            >
                                            {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}


                        <DialogFooter>
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
