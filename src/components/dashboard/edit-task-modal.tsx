
'use client';
 
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, Loader2, Sparkles, Trash2, UserCheck } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().min(1, 'Description is required.'),
  dueDate: z.date({ required_error: 'A due date is required.' }),
  assignees: z.array(z.string()).min(1, 'At least one assignee is required.'),
  attachment: z.any().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface EditTaskModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onUpdateTask: (taskId: string, updatedTask: Partial<Omit<Task, 'id'>>) => void;
  onDeleteTask: (taskId: string) => void;
  allUsers: User[];
  task: Task;
  currentUser: User | null;
}

export function EditTaskModal({ isOpen, setIsOpen, onUpdateTask, onDeleteTask, allUsers, task, currentUser }: EditTaskModalProps) {
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const { toast } = useToast();
  
  const isDomainLeadAssigned = currentUser?.role === 'domain-lead' && task.status === 'Unassigned' && task.assignedToLead?.id === currentUser.id;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      dueDate: new Date(task.dueDate),
      assignees: task.assignees.map(u => u.id),
      attachment: undefined, // Don't pre-fill file input
    },
  });
  
  const assignableUsers = React.useMemo(() => {
    const targetDomain = task.domain;
    if (!targetDomain) return [];

    if (isDomainLeadAssigned || canEditTask) {
        return allUsers.filter(u => u.role === 'member' && (u.domains || []).includes(targetDomain));
    }
    return [];
  }, [allUsers, task.domain, isDomainLeadAssigned, currentUser]);


  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        title: task.title,
        description: task.description,
        dueDate: new Date(task.dueDate),
        assignees: task.assignees.map(u => u.id),
        attachment: undefined,
      });
    }
  }, [isOpen, task, form]);


  const descriptionValue = form.watch('description');

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
      const suggestedUserIds = result.suggestedAssignees
        .map(name => assignableUsers.find(u => u.name === name)?.id)
        .filter((id): id is string => !!id);
      
      form.setValue('assignees', suggestedUserIds);

      toast({
        title: 'Suggestions applied!',
        description: 'AI-powered suggestions have been applied for assignees.',
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
    const assignees = allUsers.filter(u => data.assignees.includes(u.id));
    let attachmentPath = task.attachment; // Keep old attachment by default

    if (data.attachment && data.attachment[0]) {
      attachmentPath = await uploadFile(data.attachment[0]);
      if (!attachmentPath) return; // Stop submission if upload fails
    }

    const updatedTask: Partial<Omit<Task, 'id' | 'assignedToLead'>> & { assignedToLead?: User | null } = {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate.toISOString(),
      assignees,
      attachment: attachmentPath,
    };
    
    if (isDomainLeadAssigned) {
        updatedTask.status = 'Pending';
        updatedTask.assignedToLead = null;
    }
    
    onUpdateTask(task.id, updatedTask);
    form.reset();
    setIsOpen(false);
  };
  
  const handleDelete = () => {
    onDeleteTask(task.id);
    setIsOpen(false);
  };

  const canEditTask = currentUser?.role === 'super-admin' || (currentUser?.role === 'domain-lead' && task.domain === currentUser.domain);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className='font-headline'>Edit Task</DialogTitle>
          <DialogDescription>Update the details below for the task. Use the AI assistant to get suggestions for assignees.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-[60vh] pr-6">
              <div className="space-y-4">
                {isDomainLeadAssigned && (
                    <div className="p-3 rounded-md bg-accent/20 text-accent-foreground border border-accent">
                        <div className="flex items-center gap-2">
                           <UserCheck/>
                           <h3 className="font-semibold">Assign Task to Members</h3>
                        </div>
                        <p className="text-sm text-accent-foreground/80 mt-1">This task was assigned to you. Please review and assign it to members of your domain.</p>
                    </div>
                )}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Implement new auth flow" {...field} disabled={!canEditTask && !isDomainLeadAssigned} />
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
                        <Textarea placeholder="Describe the task in detail..." className="min-h-[100px]" {...field} disabled={!canEditTask && !isDomainLeadAssigned} />
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

                <FormField
                  control={form.control}
                  name="assignees"
                  render={() => (
                    <FormItem>
                      <FormLabel>Assignees</FormLabel>
                       <ScrollArea className="h-40">
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
                       </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
                                   disabled={!canEditTask && !isDomainLeadAssigned}
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
                                disabled={(date) => date < new Date('1900-01-01')}
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
                          <FormLabel>Replace PDF</FormLabel>
                          <FormControl>
                            <Input type="file" accept=".pdf" {...form.register('attachment')} disabled={!canEditTask && !isDomainLeadAssigned}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter className="justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={!canEditTask}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the task
                      and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
                      Delete Task
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isUploading}>
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isDomainLeadAssigned ? 'Assign Task' : 'Update Task'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
