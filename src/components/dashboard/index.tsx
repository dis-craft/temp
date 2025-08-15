
'use client';

import * as React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot, addDoc, query, orderBy, doc, updateDoc, getDoc, where, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Task, User as UserType } from '@/lib/types';
import TaskCard from './task-card';
import { CreateTaskModal } from './create-task-modal';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { logActivity } from '@/lib/logger';

export default function Dashboard() {
  const [currentUser, setCurrentUser] = React.useState<UserType | null>(null);
  const [loadingUser, setLoadingUser] = React.useState(true);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [allUsers, setAllUsers] = React.useState<UserType[]>([]);
  const [isCreateModalOpen, setCreateModalOpen] = React.useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const domainFilter = searchParams.get('domain');

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
        if (user) {
           const userDoc = await getDoc(doc(db, 'users', user.uid));
           if(userDoc.exists()) {
              const userData = { id: user.uid, ...userDoc.data() } as UserType;
              setCurrentUser(userData);

              // Setup listeners after we have the user
              setupListeners(userData);
           }
        } else {
            setCurrentUser(null);
        }
        setLoadingUser(false);
    });
    
    const setupListeners = (user: UserType) => {
        // Users listener
        const usersQuery = query(collection(db, 'users'));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserType));
            setAllUsers(usersData);
        });

        // Tasks listener
        let tasksQuery;
        if (user.role === 'domain-lead' && user.domain) {
            tasksQuery = query(collection(db, 'tasks'), where('domain', '==', user.domain));
        } else if (user.role === 'admin') {
            tasksQuery = query(collection(db, 'tasks'), where('assignees', 'array-contains', { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role, domain: user.domain }));
        }
        else {
             tasksQuery = query(collection(db, 'tasks'), orderBy('dueDate', 'desc'));
        }
        const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
          const tasksData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
          setTasks(tasksData);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            toast({
                variant: 'destructive',
                title: 'Error loading tasks',
                description: 'Could not load tasks. You might be missing a required Firestore index. Please check the console for errors.'
            })
        });

        return () => {
            unsubscribeUsers();
            unsubscribeTasks();
        };
    }

    return () => {
      unsubscribeAuth();
    }
  }, [toast]);
  
  const addTask = async (newTask: Omit<Task, 'id' | 'domain'>, sendEmail: boolean) => {
    try {
      let taskWithDomain: Omit<Task, 'id'> & { domain: string | null | undefined } = { ...newTask, domain: null };
      
      if (currentUser?.role === 'domain-lead') {
        taskWithDomain.domain = currentUser.domain;
      } else if (currentUser?.role === 'super-admin' && domainFilter) {
        taskWithDomain.domain = domainFilter;
      } else if (currentUser?.role === 'super-admin' && newTask.assignedToLead) {
        // If assigned to a lead, infer domain from the first lead
        const leadUser = allUsers.find(u => u.id === newTask.assignedToLead?.id);
        if (leadUser) {
          taskWithDomain.domain = leadUser.domain;
        }
      }


      const docRef = await addDoc(collection(db, 'tasks'), taskWithDomain);
      
      toast({
        title: 'Task Created!',
        description: `Task "${newTask.title}" has been successfully created.`,
      });
      await logActivity(`Task created: "${newTask.title}"`, 'Task Management', currentUser);

      if (sendEmail) {
        const leadOrAssignees = newTask.assignedToLead ? [newTask.assignedToLead] : newTask.assignees;
        await fetch('/api/send-task-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            task: {...taskWithDomain, id: docRef.id},
            assignees: leadOrAssignees,
            domainLeadEmail: currentUser?.email
          }),
        });
      }

    } catch(e) {
      toast({
        title: 'Error creating task',
        description: (e as Error).message,
        variant: 'destructive',
      });
      await logActivity(`Error creating task: ${(e as Error).message}`, 'Error', currentUser);
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
       await logActivity(`Task updated: (ID: ${taskId})`, 'Task Management', currentUser);
    } catch (e) {
      toast({
        title: 'Error updating task',
        description: (e as Error).message,
        variant: 'destructive',
      });
      await logActivity(`Error updating task: ${(e as Error).message}`, 'Error', currentUser);
    }
  };
  
  const deleteTask = async (taskId: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
      toast({
        title: 'Task Deleted!',
        description: 'The task has been successfully deleted.',
      });
      await logActivity(`Task deleted: (ID: ${taskId})`, 'Task Management', currentUser);
    } catch (e) {
      toast({
        title: 'Error deleting task',
        description: (e as Error).message,
        variant: 'destructive',
      });
      await logActivity(`Error deleting task: ${(e as Error).message}`, 'Error', currentUser);
    }
  };

  const hasPermission = (permissions: Array<'create_task' | 'view_all_tasks'>) => {
    if (!currentUser) return false;
    const userRole = currentUser.role;
    if (userRole === 'super-admin' || userRole === 'admin') return true;
    if (userRole === 'domain-lead') {
        return permissions.includes('create_task');
    }
    return false;
  }

  const visibleTasks = React.useMemo(() => {
    if (!currentUser) return [];

    let filteredTasks = tasks;

    // Superadmin/Admin can filter by domain via URL
    if ((currentUser.role === 'super-admin' || currentUser.role === 'admin')) {
      if (domainFilter) {
          filteredTasks = tasks.filter(task => task.domain === domainFilter);
      }
    } else if (currentUser.role === 'domain-lead') {
      filteredTasks = tasks.filter(task => task.domain === currentUser.domain);
      // Domain leads should also see tasks assigned to them before they assign to members
      filteredTasks = filteredTasks.filter(task => (task.status !== 'Unassigned' || task.assignedToLead?.id === currentUser.id));

    } else if (currentUser.role === 'member') {
      filteredTasks = tasks.filter(task => (task.assignees || []).some(assignee => assignee.id === currentUser.id));
    }

    return filteredTasks;
  }, [currentUser, tasks, domainFilter]);
  
  const assignableUsers = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'domain-lead') {
        // Domain leads can only assign to members of their domain
        return allUsers.filter(u => u.role === 'member' && u.domain === currentUser.domain);
    }
    if (currentUser.role === 'super-admin' || currentUser.role === 'admin') {
        const members = allUsers.filter(u => u.role === 'member');
        if (domainFilter) {
            return members.filter(u => u.domain === domainFilter);
        }
        return members;
    }
    return [];
  }, [currentUser, allUsers, domainFilter]);

  const domainLeads = React.useMemo(() => {
     if (!currentUser) return [];
     const leads = allUsers.filter(u => u.role === 'domain-lead');
     if ((currentUser.role === 'super-admin' || currentUser.role === 'admin') && domainFilter) {
         return leads.filter(u => u.domain === domainFilter);
     }
     return leads;
  }, [currentUser, allUsers, domainFilter]);

  const admins = React.useMemo(() => {
    return allUsers.filter(u => u.role === 'admin');
  }, [allUsers]);

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
  
  const canCreateTask = hasPermission(['create_task']) && (currentUser.role !== 'admin');
  const pageTitle = domainFilter ? `${domainFilter} Domain Tasks` : "Tasks Overview";
  const pageDescription = domainFilter ? `Viewing tasks for the ${domainFilter} domain.` : "Manage and track all your team's tasks.";


  return (
    <div className="w-full h-full flex flex-col">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h2 className="text-2xl font-semibold font-headline">{pageTitle}</h2>
           <p className="text-muted-foreground">{pageDescription}</p>
        </div>
        {canCreateTask && (
          <Button onClick={() => setCreateModalOpen(true)}>
            <PlusCircle className="mr-2" />
            Create Task
          </Button>
        )}
      </header>
      
      <div className="flex-1 overflow-y-auto pt-6 pr-2 -mr-2">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleTasks.map((task) => (
            <TaskCard key={task.id} task={task} currentUser={currentUser} allUsers={allUsers} onUpdateTask={updateTask} onDeleteTask={deleteTask} />
          ))}
          {visibleTasks.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">
              {domainFilter ? `No tasks found for the ${domainFilter} domain.` : 'No tasks assigned yet.'}
            </div>
          )}
        </div>
      </div>

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        setIsOpen={setCreateModalOpen}
        onCreateTask={addTask}
        allUsers={allUsers}
        assignableUsers={assignableUsers}
        domainLeads={domainLeads}
        admins={admins}
        currentUser={currentUser}
      />
    </div>
  );
}
