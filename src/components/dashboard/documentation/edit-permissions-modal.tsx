
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Shield, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DocumentationItem } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const permissionsSchema = z.object({
    viewableBy: z.array(z.string()).optional(),
});

type PermissionsFormValues = z.infer<typeof permissionsSchema>;

interface EditPermissionsModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isSubmitting: boolean;
    onSubmit: (itemId: string, viewableBy: string[]) => Promise<void>;
    item: DocumentationItem;
    domains: { id: string }[];
}

export function EditPermissionsModal({ isOpen, setIsOpen, isSubmitting, onSubmit, item, domains }: EditPermissionsModalProps) {
    const form = useForm<PermissionsFormValues>({
        resolver: zodResolver(permissionsSchema),
        defaultValues: {
            viewableBy: item.viewableBy || [],
        },
    });

    React.useEffect(() => {
        if (isOpen) {
            form.reset({
                viewableBy: item.viewableBy || [],
            });
        }
    }, [isOpen, item, form]);

    const handleSubmit = async (data: PermissionsFormValues) => {
        await onSubmit(item.id, data.viewableBy || []);
    };
    
    const roleOptions = [
        { value: 'super-admin', label: 'Super Admins', group: 'Special Roles' },
        { value: 'admin', label: 'Admins', group: 'Special Roles' },
        { value: 'domain-lead', label: 'All Domain Leads', group: 'Broad Roles' },
        { value: 'member', label: 'All Members', group: 'Broad Roles' },
        ...domains.map(d => ({ value: `${d.id}-lead`, label: `${d.id} Leads`, group: 'Domain-Specific Roles' })),
        ...domains.map(d => ({ value: `${d.id}-member`, label: `${d.id} Members`, group: 'Domain-Specific Roles' })),
    ].sort((a,b) => a.label.localeCompare(b.label));

    const groupedOptions = roleOptions.reduce((acc, option) => {
        if (!acc[option.group]) {
            acc[option.group] = [];
        }
        acc[option.group].push(option);
        return acc;
    }, {} as Record<string, typeof roleOptions>);


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2"><Shield /> Edit Permissions</DialogTitle>
                    <DialogDescription>
                        Update who can view the {item.type} <span className="font-semibold text-foreground">"{item.name}"</span>.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
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
                                        className="w-full justify-between h-auto min-h-10"
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
                                        <ScrollArea className="max-h-60">
                                            {Object.entries(groupedOptions).map(([groupName, options], index) => (
                                                <React.Fragment key={groupName}>
                                                    {index > 0 && <CommandSeparator />}
                                                    <CommandGroup heading={groupName}>
                                                        {options.map((option) => (
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
                                                </React.Fragment>
                                            ))}
                                        </ScrollArea>
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
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
