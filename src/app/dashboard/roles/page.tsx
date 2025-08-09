'use client';

import * as React from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, setDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Role, User, Permission } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

const allPermissions: Permission[] = ['create_task', 'edit_task', 'review_submissions', 'manage_roles'];
const permissionLabels: Record<Permission, string> = {
    create_task: 'Create Tasks',
    edit_task: 'Edit Tasks',
    review_submissions: 'Review Submissions',
    manage_roles: 'Manage Roles',
};

export default function ManageRolesPage() {
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [newRoleName, setNewRoleName] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const unsubRoles = onSnapshot(collection(db, 'roles'), (snapshot) => {
      setRoles(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Role)));
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
    });

    return () => {
        unsubRoles();
        unsubUsers();
    };
  }, []);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Role name cannot be empty.' });
      return;
    }
    try {
      const rolesRef = collection(db, 'roles');
      const docRef = await addDoc(rolesRef, { name: newRoleName, permissions: [] });
      await updateDoc(docRef, { id: docRef.id });
      setNewRoleName('');
      toast({ title: 'Success', description: `Role "${newRoleName}" created.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    }
  };

  const handleUpdateRolePermissions = async (roleId: string, permission: Permission, checked: boolean) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    const currentPermissions = role.permissions || [];
    const newPermissions = checked
      ? [...currentPermissions, permission]
      : currentPermissions.filter(p => p !== permission);
    
    try {
      await updateDoc(doc(db, 'roles', roleId), { permissions: newPermissions });
      toast({ title: 'Success', description: `Permissions updated for role "${role.name}".` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    }
  };

  const handleUpdateUserRole = async (userId: string, roleId: string) => {
    try {
        await updateDoc(doc(db, 'users', userId), { roleId: roleId });
        toast({ title: 'Success', description: `User role updated.` });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if(roleName === 'super-admin') {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete the super-admin role.' });
        return;
    }
    // TODO: Handle re-assigning users with this role
    try {
      await deleteDoc(doc(db, 'roles', roleId));
      toast({ title: 'Success', description: `Role "${roleName}" deleted.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    }
  };

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="w-full h-full flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Manage Roles & Permissions</h1>
        <p className="text-muted-foreground">Create, edit, and assign roles to users.</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Role</CardTitle>
                    <CardDescription>Define a new role for your team.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Input
                        placeholder="e.g., Content Moderator"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                    />
                    <Button onClick={handleCreateRole}>
                        <PlusCircle className="mr-2" />
                        Create Role
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Role Permissions</CardTitle>
                    <CardDescription>Assign specific permissions to each role.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {roles.map((role) => (
                    <div key={role.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold font-headline">{role.name}</h3>
                            {role.name !== 'super-admin' && (
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role.id, role.name)}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                    <span className="sr-only">Delete Role</span>
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {allPermissions.map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${role.id}-${permission}`}
                                    checked={(role.permissions || []).includes(permission)}
                                    onCheckedChange={(checked) => handleUpdateRolePermissions(role.id, permission, !!checked)}
                                    disabled={role.name === 'super-admin'}
                                />
                                <Label htmlFor={`${role.id}-${permission}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {permissionLabels[permission]}
                                </Label>
                            </div>
                        ))}
                        </div>
                    </div>
                    ))}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>User Assignments</CardTitle>
                    <CardDescription>Assign roles to individual users.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {users.map(user => (
                        <div key={user.id} className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            <Select
                                value={user.roleId || ''}
                                onValueChange={(roleId) => handleUpdateUserRole(user.id, roleId)}
                                disabled={user.email === 'super-admin@taskmaster.pro'}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(role => (
                                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
