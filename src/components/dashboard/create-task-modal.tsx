
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, Loader2, Sparkles, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatUserName } from '@/lib/utils';
import { format } from 'date-fns';
import { suggestAssignees } from '@/ai/flows/suggest-assignees';
import { useToast } from '@/hooks/use-toast';
import type { Task, User } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().min(1, 'Description is required.'),
  dueDate: z.date({ required_error: 'A due date is required.' }),
  assignees: z.array(z.string()).optional(),
  assignedToLead: z.string().optional(),
  reminders: z.array(z.string()).optional(),
  attachment: z.any().optional(),
  sendEmail: z.boolean().default(false),
}).refine(data => {
    if (data.assignedToLead) {
        return true; // if assignedToLead is present, assignees can be empty
    }
    return data.assignees && data.assignees.length > 0;
}, {
    message: "Either assign to a lead or select at least one member.",
    path: ["assignees"],
});


type TaskFormValues = z.infer<typeof taskFormSchema>;

interface CreateTaskModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onCreateTask: (newTask: Omit<Task, 'id' | 'domain'>, sendEmail: boolean) => void;
  allUsers: User[];
  assignableUsers: User[];
  domainLeads: User[];
  currentUser: User | null;
}

export function CreateTaskModal({ isOpen, setIsOpen, onCreateTask, allUsers, assignableUsers, domainLeads, currentUser }: CreateTaskModalProps) {
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const { toast } = useToast();
  const isSuperAdmin = currentUser?.role === 'super-admin';

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      assignees: [],
      assignedToLead: '',
      reminders: [],
      sendEmail: false,
    },
  });

  const descriptionValue = form.watch('description');
  const assignedToLeadValue = form.watch('assignedToLead');


  React.useEffect(() => {
    if (assignedToLeadValue) {
        form.setValue('assignees', []);
    }
  }, [assignedToLeadValue, form]);

  const handleSuggestion = async () => {
    if (!descriptionValue) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a task description to get suggestions.',
      });
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await suggestAssignees({ taskDescription: descriptionValue });
      
      if (!isSuperAdmin) {
          const suggestedUserIds = result.suggestedAssignees
            .map(name => allUsers.find(u => u.name === name)?.id)
            .filter((id): id is string => !!id);
          form.setValue('assignees', suggestedUserIds);
      }
      
      form.setValue('reminders', result.suggestedReminderIntervals);

      toast({
        title: 'Suggestions applied!',
        description: 'AI-powered suggestions have been applied to the form.',
      });
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'AI Suggestion Failed',
        description: 'Could not fetch suggestions. Please try again.',
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'X-Custom-Auth-Key': process.env.NEXT_PUBLIC_JWT_SECRET || '',
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'File upload failed');
        }

        const result = await response.json();
        return result.filePath;
    } catch (error) {
        console.error('Upload error:', error);
        toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: (error as Error).message,
        });
        return '';
    } finally {
        setIsUploading(false);
    }
  };

  const onSubmit = async (data: TaskFormValues) => {
    let assignees: User[] = [];
    let assignedToLead: User | undefined = undefined;
    let status: Task['status'] = 'Pending';

    if (data.assignedToLead) {
        assignedToLead = domainLeads.find(l => l.id === data.assignedToLead);
        status = 'Unassigned';
    } else if (data.assignees) {
        assignees = allUsers.filter(u => data.assignees!.includes(u.id));
    }


    let attachmentPath = '';

    if (data.attachment && data.attachment[0]) {
      attachmentPath = await uploadFile(data.attachment[0]);
      if (!attachmentPath) return; // Stop submission if upload fails
    }

    const newTask: Omit<Task, 'id' | 'domain'> = {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate.toISOString(),
      status,
      assignees,
      assignedToLead,
      comments: [],
      submissions: [],
      attachment: attachmentPath,
    };
    
    onCreateTask(newTask, data.sendEmail);
    form.reset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className='font-headline'>Create New Task</DialogTitle>
          <DialogDescription>Fill in the details below to create a new task. Use the AI assistant to get suggestions for assignees.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-[60vh] pr-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Implement new auth flow" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the task in detail..." className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="button" variant="outline" size="sm" onClick={handleSuggestion} disabled={isSuggesting || !descriptionValue}>
                  {isSuggesting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4 text-accent" />
                  )}
                  Get AI Suggestions
                </Button>

                {isSuperAdmin ? (
                    <FormField
                      control={form.control}
                      name="assignedToLead"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign to Domain Lead</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a domain lead" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {domainLeads.map(lead => (
                                    <SelectItem key={lead.id} value={lead.id}>
                                        {formatUserName(lead, allUsers)}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                ) : (
                    <FormField
                    control={form.control}
                    name="assignees"
                    render={() => (
                        <FormItem>
                        <FormLabel>Assignees</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                            {assignableUsers.map((user) => (
                                <FormField
                                key={user.id}
                                control={form.control}
                                name="assignees"
                                render={({ field }) => {
                                    return (
                                    <FormItem
                                        key={user.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(user.id)}
                                            onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), user.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                    (value) => value !== user.id
                                                    )
                                                )
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        {formatUserName(user, allUsers)}
                                        </FormLabel>
                                    </FormItem>
                                    )
                                }}
                                />
                            ))}
                            </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}
                
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Due Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date() || date < new Date('1900-01-01')}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="attachment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attach PDF</FormLabel>
                          <FormControl>
                            <Input type="file" accept=".pdf" {...form.register('attachment')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                 <FormField
                  control={form.control}
                  name="sendEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2"><Mail/> Send Email Notification</FormLabel>
                        <p className="text-xs text-muted-foreground">Notify assignees and yourself via email about this new task.</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
