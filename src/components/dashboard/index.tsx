'use client';

import * as React from 'react';
import { PlusCircle, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { allUsers, allTasks } from '@/lib/mock-data';
import type { Task, User as UserType, UserRole } from '@/lib/types';
import TaskCard from './task-card';
import { CreateTaskModal } from './create-task-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';

export default function Dashboard() {
  const [currentUser, setCurrentUser] = React.useState<UserType>(allUsers[0]);
  const [tasks, setTasks] = React.useState<Task[]>(allTasks);
  const [isCreateModalOpen, setCreateModalOpen] = React.useState(false);

  const handleRoleChange = (user: UserType) => {
    setCurrentUser(user);
  };

  const visibleTasks = React.useMemo(() => {
    if (currentUser.role === 'member') {
      return tasks.filter(task => task.assignees.some(assignee => assignee.id === currentUser.id));
    }
    return tasks;
  }, [currentUser, tasks]);
  
  const addTask = (newTask: Task) => {
    setTasks(prevTasks => [newTask, ...prevTasks]);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {currentUser.name}.</p>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                  <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {currentUser.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Switch User</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allUsers.map((user) => (
                <DropdownMenuItem key={user.id} onClick={() => handleRoleChange(user)}>
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user.role.replace('-', ' ')}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {(currentUser.role === 'domain-lead' || currentUser.role === 'admin') && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <PlusCircle className="mr-2" />
              Create Task
            </Button>
          )}
        </div>
      </header>
      
      <div className="py-6">
        <h2 className="text-2xl font-semibold font-headline">Your Tasks</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleTasks.map((task) => (
            <TaskCard key={task.id} task={task} currentUser={currentUser} />
          ))}
        </div>
      </div>

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        setIsOpen={setCreateModalOpen}
        onCreateTask={addTask}
      />
    </div>
  );
}
