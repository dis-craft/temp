'use client';

import * as React from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  writeBatch,
  arrayUnion,
  arrayRemove,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Role, Permission, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, UserPlus, Loader2, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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


export default function ManageRolesPage() {
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [permissions, setPermissions] = React.useState<Permission[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [newRoleName, setNewRoleName] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [isAssignUserModalOpen, setAssignUserModalOpen] = React.useState(false);
  const [selectedRoleForAssignment, setSelectedRoleForAssignment] = React.useState<Role | null>(null);
  const [userEmail, setUserEmail] = React.useState('');


  const { toast } = useToast();

  React.useEffect(() => {
    const unsubRoles = onSnapshot(collection(db, 'roles'), (snapshot) => {
      const rolesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Role));
      setRoles(rolesData);
      setIsLoading(false);
    });

    const unsubPermissions = onSnapshot(collection(db, 'permissions'), (snapshot) => {
        const permsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Permission));
        setPermissions(permsData);
    });

    return () => {
      unsubRoles();
      unsubPermissions();
    };
  }, []);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Role name cannot be empty.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'roles'), {
        name: newRoleName,
        permissions: [],
      });
      toast({ title: 'Success', description: `Role "${newRoleName}" created.` });
      setNewRoleName('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error creating role', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDeleteRole = async (roleId: string) => {
    if (roles.find(r => r.id === roleId)?.name === 'super-admin') {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete the super-admin role.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'roles', roleId));
      toast({ title: 'Success', description: 'Role deleted.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error deleting role', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionChange = async (roleId: string, permissionId: string, checked: boolean) => {
    const roleRef = doc(db, 'roles', roleId);
    try {
        if (checked) {
            await updateDoc(roleRef, { permissions: arrayUnion(permissionId) });
        } else {
            await updateDoc(roleRef, { permissions: arrayRemove(permissionId) });
        }
        toast({ title: 'Permissions updated successfully.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error updating permissions', description: error.message });
    }
  };
  
  const handleAssignRoleToUser = async () => {
    if (!userEmail || !selectedRoleForAssignment) {
        toast({ variant: 'destructive', title: 'Error', description: 'Email and role are required.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const usersQuery = query(collection(db, 'users'), where('email', '==', userEmail));
        const querySnapshot = await getDocs(usersQuery);

        if (querySnapshot.empty) {
            toast({ variant: 'destructive', title: 'User not found', description: `No user found with email: ${userEmail}` });
            return;
        }

        const batch = writeBatch(db);
        const roleRef = doc(db, "roles", selectedRoleForAssignment.id);
        const roleSnap = await getDoc(roleRef);
        if (!roleSnap.exists()) {
             toast({ variant: 'destructive', title: 'Role not found' });
             return;
        }

        querySnapshot.forEach(userDoc => {
            const userRef = doc(db, 'users', userDoc.id);
            batch.update(userRef, { role: roleSnap.data() });
        });

        await batch.commit();

        toast({ title: 'Success', description: `Role "${selectedRoleForAssignment.name}" assigned to ${userEmail}.` });
        setAssignUserModalOpen(false);
        setUserEmail('');
        setSelectedRoleForAssignment(null);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error assigning role', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
};


  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Roles & Permissions</h1>
          <p className="text-muted-foreground">Create and manage roles for your application users.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create New Role</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Input
            placeholder="Enter role name (e.g., Editor, Viewer)"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            disabled={isSubmitting}
          />
          <Button onClick={handleCreateRole} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2" />}
             Create Role
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{role.name}</CardTitle>
              <div className='flex gap-2'>
                <Button variant="outline" size="sm" onClick={() => { setSelectedRoleForAssignment(role); setAssignUserModalOpen(true); }}><UserPlus className="mr-2 h-4 w-4"/> Assign</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon_sm" disabled={role.name === 'super-admin'}>
                      <Trash2 className="h-4 w-4"/>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the role.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteRole(role.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold mb-2">Permissions</h4>
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${role.id}-${permission.id}`}
                      checked={(role.permissions || []).includes(permission.id)}
                      onCheckedChange={(checked) => handlePermissionChange(role.id, permission.id, !!checked)}
                      disabled={role.name === 'super-admin'}
                    />
                    <label htmlFor={`${role.id}-${permission.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {permission.name}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Dialog open={isAssignUserModalOpen} onOpenChange={setAssignUserModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Assign Role to User</DialogTitle>
                <DialogDescription>
                    Assign the &quot;{selectedRoleForAssignment?.name}&quot; role to a user by entering their email address.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <Input 
                    placeholder="user@example.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setAssignUserModalOpen(false)}>Cancel</Button>
                <Button onClick={handleAssignRoleToUser} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2"/>}
                    Assign Role
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
