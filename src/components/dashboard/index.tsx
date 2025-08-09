'use client';

import * as React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot, addDoc, query, orderBy, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Task, User as UserType, Role, Permission } from '@/lib/types';
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
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const hasPermission = (user: UserType, permission: Permission) => {
  return user.role?.permissions?.includes(permission) ?? false;
}

export default function Dashboard() {
  const [currentUser, setCurrentUser] = React.useState<UserType | null>(null);
  const [loadingUser, setLoadingUser] = React.useState(true);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [allUsers, setAllUsers] = React.useState<UserType[]>([]);
  const [isCreateModalOpen, setCreateModalOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchUsersAndRoles = async () => {
        const rolesSnapshot = await getDocs(collection(db, 'roles'));
        const rolesMap = new Map<string, Role>();
        rolesSnapshot.forEach(doc => rolesMap.set(doc.id, { id: doc.id, ...doc.data() } as Role));

        const usersQuery = collection(db, 'users');
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => {
                const user = { ...doc.data(), id: doc.id } as UserType;
                if (user.roleId && rolesMap.has(user.roleId)) {
                    user.role = rolesMap.get(user.roleId);
                }
                return user;
            });
            setAllUsers(usersData);

             if (auth.currentUser) {
                const currentUserData = usersData.find(u => u.id === auth.currentUser!.uid);
                setCurrentUser(currentUserData || null);
             }
             setLoadingUser(false);
        });
        
        return () => unsubscribeUsers();
    };
    
    fetchUsersAndRoles();

    const q = query(collection(db, 'tasks'), orderBy('dueDate', 'desc'));
    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
      setTasks(tasksData);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
        if (user && !currentUser) {
           const userDoc = await getDoc(doc(db, 'users', user.uid));
           if (userDoc.exists()) {
              const userData = userDoc.data() as UserType;
              if (userData.roleId) {
                const roleDoc = await getDoc(doc(db, 'roles', userData.roleId));
                if (roleDoc.exists()) {
                    userData.role = roleDoc.data() as Role;
                }
              }
              setCurrentUser(userData);
           }
        } else if (!user) {
            setCurrentUser(null);
        }
        setLoadingUser(false);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeAuth();
    }
  }, [currentUser]);
  
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

  const updateTask = async (taskId: string, updatedData: Partial<Omit<Task, 'id'>>) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, updatedData);
      toast({
        title: 'Task Updated!',
        description: 'The task has been successfully updated.',
      });
    } catch (e) {
      toast({
        title: 'Error updating task',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  };


  const visibleTasks = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role?.name === 'super-admin' || currentUser.role?.name === 'admin' || currentUser.role?.name === 'domain-lead') {
        return tasks;
    }
    if (currentUser.role?.name === 'member') {
      return tasks.filter(task => (task.assignees || []).some(assignee => assignee.id === currentUser.id));
    }
    return [];
  }, [currentUser, tasks]);
  
  if (loadingUser) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <p>Could not load user data. Please try logging in again.</p>
        </div>
    );
  }

  const canCreateTask = hasPermission(currentUser, 'create_task');

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
                  <AvatarImage src={currentUser.avatarUrl || undefined} alt={currentUser.name || ''} />
                  <AvatarFallback>{currentUser.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                {currentUser.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{currentUser.role?.name || 'No Role'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => auth.signOut()}>
                  Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {canCreateTask && (
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
            <TaskCard key={task.id} task={task} currentUser={currentUser} allUsers={allUsers} onUpdateTask={updateTask} />
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
