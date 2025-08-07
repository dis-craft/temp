'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { suggestAssignees } from '@/ai/flows/suggest-assignees';
import { useToast } from '@/hooks/use-toast';
import type { Task, User } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().min(1, 'Description is required.'),
  dueDate: z.date({ required_error: 'A due date is required.' }),
  assignees: z.array(z.string()).min(1, 'At least one assignee is required.'),
  reminders: z.array(z.string()).optional(),
  attachment: z.any().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface CreateTaskModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onCreateTask: (newTask: Omit<Task, 'id'>) => void;
  allUsers: User[];
}

export function CreateTaskModal({ isOpen, setIsOpen, onCreateTask, allUsers }: CreateTaskModalProps) {
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      assignees: [],
      reminders: [],
    },
  });

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
        .map(name => allUsers.find(u => u.name === name)?.id)
        .filter((id): id is string => !!id);
      
      form.setValue('assignees', suggestedUserIds);
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

  const uploadFile = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'File upload failed');
      }

      const result = await response.json();
      return result.key;

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Could not upload the file. Please try again.',
      });
      return '';
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: TaskFormValues) => {
    const assignees = allUsers.filter(u => data.assignees.includes(u.id));
    let attachmentKey = '';

    if (data.attachment && data.attachment[0]) {
      attachmentKey = await uploadFile(data.attachment[0]);
      if (!attachmentKey) return; // Stop submission if upload fails
    }

    const newTask: Omit<Task, 'id'> = {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate.toISOString(),
      status: 'Pending',
      assignees,
      comments: [],
      submissions: [],
      attachment: attachmentKey,
    };
    
    onCreateTask(newTask);
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

                <FormField
                  control={form.control}
                  name="assignees"
                  render={() => (
                    <FormItem>
                      <FormLabel>Assignees</FormLabel>
                       <div className="grid grid-cols-2 gap-4">
                          {allUsers.map((user) => (
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
                                      {user.name}
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
