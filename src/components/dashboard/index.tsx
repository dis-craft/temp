'use client';

import * as React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Task, User as UserType } from '@/lib/types';
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
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Dashboard() {
  const [currentUser, setCurrentUser] = React.useState<UserType | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [allUsers, setAllUsers] = React.useState<UserType[]>([]);
  const [isCreateModalOpen, setCreateModalOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setCurrentUser(userSnap.data() as UserType);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  React.useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('dueDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
      setTasks(tasksData);
    });

    const usersQuery = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserType));
      setAllUsers(usersData);
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
    }
  }, []);
  
  const addTask = async (newTask: Omit<Task, 'id'>) => {
    try {
      await addDoc(collection(db, 'tasks'), newTask);
      toast({
        title: 'Task Created!',
        description: `Task "${newTask.title}" has been successfully created.`,
      });
    } catch(e) {
      toast({
        title: 'Error creating task',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  };

  const visibleTasks = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'member') {
      return tasks.filter(task => task.assignees.some(assignee => assignee.id === currentUser.id));
    }
    return tasks;
  }, [currentUser, tasks]);

  if (!currentUser) {
    return null;
  }

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
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name || ''} />
                  <AvatarFallback>{currentUser.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                {currentUser.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => auth.signOut()}>
                  Sign Out
              </DropdownMenuItem>
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
            <TaskCard key={task.id} task={task} currentUser={currentUser} allUsers={allUsers} />
          ))}
        </div>
      </div>

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        setIsOpen={setCreateModalOpen}
        onCreateTask={addTask}
        allUsers={allUsers}
      />
    </div>
  );
}
