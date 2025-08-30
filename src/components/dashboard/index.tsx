
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
           const userDocRef = doc(db, 'users', user.uid);
            onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setCurrentUser({ id: user.uid, ...docSnap.data() } as UserType);
                }
                setLoadingUser(false);
            });
        } else {
            setCurrentUser(null);
            setLoadingUser(false);
        }
    });

    return () => unsubscribeAuth();
  }, []);

  React.useEffect(() => {
    if (!currentUser) return;

    // Users listener
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserType));
        setAllUsers(usersData);
    });

    // Tasks listener
    const tasksQuery = query(collection(db, 'tasks'), orderBy('dueDate', 'desc'));
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
  }, [currentUser, toast]);
  
  const addTask = async (newTask: Omit<Task, 'id' | 'domain'>, sendEmail: boolean) => {
    if (!currentUser) return;
    try {
        const activeDomain = domainFilter || currentUser?.activeDomain;
        const taskWithDomain: Omit<Task, 'id'> = { ...newTask, domain: activeDomain || null };

        if (currentUser?.role === 'super-admin') {
            if (newTask.assignedToLead) {
                const leadUser = allUsers.find(u => u.id === newTask.assignedToLead?.id);
                // If a lead is assigned, the task domain MUST be one of the lead's domains.
                // We default to their first domain if no activeDomain context is set.
                taskWithDomain.domain = activeDomain || (leadUser?.domains?.[0] || null);
            } else {
                // If assigned to members or admins, use the active domain context.
                taskWithDomain.domain = activeDomain || null;
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
                    task: { ...taskWithDomain, id: docRef.id },
                    assignees: leadOrAssignees,
                    domainLeadEmail: currentUser?.email,
                }),
            });
        }
    } catch (e) {
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
    
    const activeDomain = domainFilter || currentUser.activeDomain;

    let filteredTasks = tasks;

    // Superadmin/Admin can filter by domain via URL or active context
    if ((currentUser.role === 'super-admin' || currentUser.role === 'admin')) {
      if (activeDomain) {
          filteredTasks = tasks.filter(task => task.domain === activeDomain);
      }
    } else if (currentUser.role === 'domain-lead') {
      if (activeDomain) {
        filteredTasks = tasks.filter(task => task.domain === activeDomain);
        // Domain leads should also see tasks assigned to them before they assign to members
        filteredTasks = filteredTasks.filter(task => (task.status !== 'Unassigned' || task.assignedToLead?.id === currentUser.id));
      } else {
        // if no active domain, show all tasks from all their domains
        filteredTasks = tasks.filter(task => (currentUser.domains || []).includes(task.domain || ''));
      }
    } else if (currentUser.role === 'member') {
      if (activeDomain) {
        filteredTasks = tasks.filter(task => task.domain === activeDomain && (task.assignees || []).some(assignee => assignee.id === currentUser.id));
      } else {
         // if no active domain, show all tasks they are assigned to across all their domains
        filteredTasks = tasks.filter(task => (task.assignees || []).some(assignee => assignee.id === currentUser.id));
      }
    }

    return filteredTasks;
  }, [currentUser, tasks, domainFilter]);
  
  const assignableUsers = React.useMemo(() => {
    if (!currentUser) return [];
    const activeDomain = domainFilter || currentUser.activeDomain;
    
    if (currentUser.role === 'domain-lead' || currentUser.role === 'super-admin' || currentUser.role === 'admin') {
      if (activeDomain) {
        return allUsers.filter(u => u.role === 'member' && (u.domains || []).includes(activeDomain));
      }
      // If no domain context, a lead can only assign to their primary domain.
      if(currentUser.role === 'domain-lead' && (currentUser.domains || []).length > 0) {
        return allUsers.filter(u => u.role === 'member' && (u.domains || []).includes(currentUser.domains[0]));
      }
      // Admins without context can assign to any member
      return allUsers.filter(u => u.role === 'member');
    }
    return [];
  }, [currentUser, allUsers, domainFilter]);

  const domainLeads = React.useMemo(() => {
     if (!currentUser) return [];
     const activeDomain = domainFilter || currentUser.activeDomain;
     const leads = allUsers.filter(u => u.role === 'domain-lead');
     if ((currentUser.role === 'super-admin' || currentUser.role === 'admin') && activeDomain) {
         return leads.filter(u => (u.domains || []).includes(activeDomain));
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
  const activeDomain = domainFilter || currentUser.activeDomain;
  const pageTitle = activeDomain ? `${activeDomain} Tasks` : "Tasks Overview";
  const pageDescription = activeDomain ? `Viewing tasks for the ${activeDomain} domain.` : "Manage and track all your team's tasks.";


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
              {activeDomain ? `No tasks found for the ${activeDomain} domain.` : 'No tasks assigned yet. Select a domain to get started.'}
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
