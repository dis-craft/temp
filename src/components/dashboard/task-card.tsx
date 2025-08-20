
'use client';
 
import * as React from 'react';
import { format, isPast } from 'date-fns';
import { Calendar, Users, Paperclip, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Task, User } from '@/lib/types';
import { TaskDetailsModal } from './task-details-modal';
import { formatUserName } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  currentUser: User;
  allUsers: User[];
  onUpdateTask: (taskId: string, updatedData: Partial<Omit<Task, 'id'>>) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskCard({ task, currentUser, allUsers, onUpdateTask, onDeleteTask }: TaskCardProps) {
  const [isDetailsModalOpen, setDetailsModalOpen] = React.useState(false);
  const dueDate = new Date(task.dueDate);
  const isOverdue = isPast(dueDate) && task.status !== 'Completed';

  const getStatusBadgeVariant = (status: Task['status']) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Pending':
        return 'outline';
      case 'Unassigned':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  const assignees = task.assignees || [];
  const submissionProgress = task.status === 'Unassigned' ? 0 : (assignees.length > 0 ? (task.submissions.length / assignees.length) * 100 : 0);

  return (
    <>
      <Card 
        className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300 cursor-pointer"
        onClick={() => setDetailsModalOpen(true)}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="font-headline text-lg leading-tight pr-4">{task.title}</CardTitle>
            <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{task.description}</p>
          <div className="flex items-center text-sm text-muted-foreground gap-2">
            <Calendar className="h-4 w-4" />
            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
              {format(dueDate, 'PPP')}
            </span>
          </div>
          {task.attachment && (
            <div className="flex items-center text-sm text-muted-foreground gap-2 mt-2">
              <Paperclip className="h-4 w-4" />
              <span>Attachment</span>
            </div>
          )}
          {task.status === 'Unassigned' && task.assignedToLead && (
             <div className="flex items-center text-sm text-muted-foreground gap-2 mt-2">
              <UserCheck className="h-4 w-4" />
              <span>Assigned to {formatUserName(task.assignedToLead, allUsers)}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4">
          <div>
            <span className="text-xs font-medium text-muted-foreground">Assignees</span>
            <div className="flex items-center mt-1">
              {assignees.slice(0, 4).map((assignee) => (
                <TooltipProvider key={assignee.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-7 w-7 border-2 border-background -ml-2 first:ml-0">
                        <AvatarImage src={assignee.avatarUrl || undefined} alt={assignee.name || ''} />
                        <AvatarFallback>{assignee.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{formatUserName(assignee, allUsers)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {assignees.length > 4 && (
                <Avatar className="h-7 w-7 border-2 border-background -ml-2">
                  <AvatarFallback>+{assignees.length - 4}</AvatarFallback>
                </Avatar>
              )}
               {assignees.length === 0 && task.status !== 'Unassigned' && (
                  <p className="text-xs text-muted-foreground">No members assigned.</p>
               )}
                {task.status === 'Unassigned' && (
                  <p className="text-xs text-muted-foreground">Awaiting assignment by Lead.</p>
                )}
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">Progress</span>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={submissionProgress} className="w-24 h-2" />
              <span className="text-xs font-mono text-muted-foreground">{Math.round(submissionProgress)}%</span>
            </div>
          </div>
        </CardFooter>
      </Card>
      <TaskDetailsModal
        task={task}
        currentUser={currentUser}
        isOpen={isDetailsModalOpen}
        setIsOpen={setDetailsModalOpen}
        allUsers={allUsers}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    </>
  );
}
