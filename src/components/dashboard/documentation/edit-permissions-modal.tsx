
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Shield } from 'lucide-react';
import { DocumentationItem } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

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
                            render={() => (
                                <FormItem>
                                    <FormLabel>Who can see this?</FormLabel>
                                    <ScrollArea className="h-40 w-full rounded-md border p-4">
                                         {Object.entries(groupedOptions).map(([group, options], index) => (
                                            <div key={group}>
                                                {index > 0 && <Separator className="my-2" />}
                                                <h4 className="font-medium text-sm mb-2">{group}</h4>
                                                {options.map((option) => (
                                                    <FormField
                                                    key={option.value}
                                                    control={form.control}
                                                    name="viewableBy"
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
                                                                ? field.onChange([...(field.value || []), option.value])
                                                                : field.onChange(
                                                                    (field.value || [])?.filter(
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
