
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


const folderSchema = z.object({
    name: z.string().min(1, "Folder name cannot be empty."),
    viewableBy: z.array(z.string()).optional(),
});

type FolderFormValues = z.infer<typeof folderSchema>;

interface CreateFolderModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isSubmitting: boolean;
    onSubmit: (name: string, viewableBy: string[]) => Promise<void>;
    domains: { id: string }[];
}

export function CreateFolderModal({ isOpen, setIsOpen, isSubmitting, onSubmit, domains }: CreateFolderModalProps) {
    const form = useForm<FolderFormValues>({
        resolver: zodResolver(folderSchema),
        defaultValues: { name: '', viewableBy: [] },
    });

    const handleSubmit = async (data: FolderFormValues) => {
        await onSubmit(data.name, data.viewableBy || []);
        if (!isSubmitting) { 
            form.reset();
        }
    };
    
    React.useEffect(() => {
        if(isOpen) {
            form.reset();
        }
    }, [isOpen, form]);

    const roleOptions = [
        ...domains.map(d => ({ value: `${d.id}-lead`, label: `${d.id} Lead` })),
        ...domains.map(d => ({ value: `${d.id}-member`, label: `${d.id} Member` })),
        { value: 'admin', label: 'Admin' },
        { value: 'super-admin', label: 'Super Admin' },
        { value: 'member', label: 'All Members'},
        { value: 'domain-lead', label: 'All Domain Leads'},
    ].sort((a,b) => a.label.localeCompare(b.label));

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2"><FolderPlus /> Create New Folder</DialogTitle>
                    <DialogDescription>Enter a name and set permissions for your new folder.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
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

                        <FormField
                            control={form.control}
                            name="viewableBy"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Who can see this?</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between h-auto"
                                        >
                                        <div className="flex gap-1 flex-wrap">
                                            {field.value && field.value.length > 0 ? field.value.map(val => (
                                                <Badge key={val} variant="secondary">{roleOptions.find(o => o.value === val)?.label || val}</Badge>
                                            )) : "Select roles..."}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search roles..." />
                                        <CommandEmpty>No roles found.</CommandEmpty>
                                        <CommandGroup className="max-h-48 overflow-y-auto">
                                        {roleOptions.map((option) => (
                                            <CommandItem
                                            value={option.label}
                                            key={option.value}
                                            onSelect={() => {
                                                const currentValue = field.value || [];
                                                const isSelected = currentValue.includes(option.value);
                                                const newValue = isSelected
                                                ? currentValue.filter((v) => v !== option.value)
                                                : [...currentValue, option.value];
                                                field.onChange(newValue);
                                            }}
                                            >
                                            <Check
                                                className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value?.includes(option.value) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {option.label}
                                            </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </Command>
                                    </PopoverContent>
                                </Popover>
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
