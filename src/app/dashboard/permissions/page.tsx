
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, User, Users, Shield, Save, Trash2, X, Eye, KeyRound, MoreHorizontal, Edit, View } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth, sendPasswordReset } from '@/lib/firebase';
import type { User as UserType } from '@/lib/types';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';


interface DomainConfig {
    id: string;
    leads: string[];
    members: string[];
}

type SpecialRolesConfig = Record<string, 'super-admin' | 'admin'>;


export default function ManagePermissionsPage() {
  const [currentUser, setCurrentUser] = React.useState<UserType | null>(null);
  const [domainConfig, setDomainConfig] = React.useState<DomainConfig[]>([]);
  const [specialRolesConfig, setSpecialRolesConfig] = React.useState<SpecialRolesConfig>({});
  const [isLoading, setIsLoading] = React.useState(true);

  const [isSubmitting, setIsSubmitting] = React.useState<Record<string, boolean>>({});
  const [addingLead, setAddingLead] = React.useState<string | null>(null);
  const [newLeadEmail, setNewLeadEmail] = React.useState<Record<string, string>>({});
  const [addingMember, setAddingMember] = React.useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = React.useState<Record<string, string>>({});
  
  const [addingRole, setAddingRole] = React.useState<'super-admin' | 'admin' | null>(null);
  const [newSpecialRoleEmail, setNewSpecialRoleEmail] = React.useState('');
  
  const [addingDomain, setAddingDomain] = React.useState(false);
  const [newDomainName, setNewDomainName] = React.useState('');


  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if(userDoc.exists()) {
          const userData = { id: user.uid, ...userDoc.data() } as UserType;
          setCurrentUser(userData);
        }
      }
    });

    const unsubDomains = onSnapshot(collection(db, 'domains'), (snapshot) => {
      const domainsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DomainConfig)).sort((a,b) => a.id.localeCompare(b.id));
      setDomainConfig(domainsData);
      setIsLoading(false);
    });

    const unsubSpecialRoles = onSnapshot(doc(db, 'config', 'specialRoles'), (doc) => {
        if(doc.exists()) {
            setSpecialRolesConfig(doc.data() as SpecialRolesConfig);
        }
        setIsLoading(false);
    });

    return () => {
      unsubAuth();
      unsubDomains();
      unsubSpecialRoles();
    };
  }, []);

  const handleApiCall = async (body: any, id: string = 'global') => {
    setIsSubmitting(prev => ({ ...prev, [id]: true }));

    try {
      const response = await fetch('/api/update-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update permissions.');
      }

      toast({
        title: 'Success!',
        description: result.message || "Permissions updated successfully.",
      });

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [id]: false }));
      setAddingLead(null);
      setAddingMember(null);
      setAddingRole(null);
      setNewSpecialRoleEmail('');
      setAddingDomain(false);
      setNewDomainName('');
    }
  };
  
  const handleAddDomain = () => {
    if (!newDomainName || !newDomainName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Domain name cannot be empty.' });
      return;
    }
    handleApiCall({ action: 'add-domain', domain: newDomainName }, 'add-domain');
  }

  const handleDeleteDomain = (domainName: string) => {
    handleApiCall({ action: 'delete-domain', domain: domainName }, `delete-${domainName}`);
  }

  const handleAddMember = (domainName: string) => {
    const email = newMemberEmail[domainName];
    if (!email || !email.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Email cannot be empty.' });
      return;
    }
    handleApiCall({ action: 'add-member', domain: domainName, email }, domainName);
    setNewMemberEmail(prev => ({ ...prev, [domainName]: '' }));
  };

  const handleRemoveMember = (domainName: string, email: string) => {
    handleApiCall({ action: 'remove-member', domain: domainName, email }, domainName);
  };
  
  const handleAddLead = (domainName: string) => {
    const email = newLeadEmail[domainName];
    if (!email || !email.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Lead email cannot be empty.' });
      return;
    }
    handleApiCall({ action: 'add-lead', domain: domainName, email: email }, domainName);
    setNewLeadEmail(prev => ({ ...prev, [domainName]: '' }));
  };

  const handleRemoveLead = (domainName: string, email: string) => {
    handleApiCall({ action: 'remove-lead', domain: domainName, email }, domainName);
  };

  const handleAddSpecialRole = () => {
    if (!newSpecialRoleEmail || !newSpecialRoleEmail.trim() || !addingRole) {
        toast({ variant: 'destructive', title: 'Error', description: 'Email cannot be empty.' });
        return;
    }
    handleApiCall({ action: 'add-special-role', email: newSpecialRoleEmail, role: addingRole }, 'special-roles');
  }

  const handleRemoveSpecialRole = (email: string) => {
     handleApiCall({ action: 'remove-special-role', email }, 'special-roles');
  }

  const handlePasswordReset = async (email: string) => {
    try {
      await sendPasswordReset(email);
      toast({
        title: 'Password Reset Email Sent',
        description: `A password reset link has been sent to ${email}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send Reset Email',
        description: (error as Error).message,
      });
    }
  };
  
  if (isLoading || !currentUser) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  const isSuperAdmin = currentUser.role === 'super-admin';
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Permissions</h1>
          <p className="text-muted-foreground">View special roles and manage domain members and leads.</p>
        </div>
        {isSuperAdmin && (
            <div>
            {!addingDomain ? (
                <Button onClick={() => setAddingDomain(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Domain
                </Button>
            ) : (
                <div className="flex gap-2">
                    <Input 
                        value={newDomainName}
                        placeholder="New Domain Name"
                        onChange={(e) => setNewDomainName(e.target.value)}
                        disabled={isSubmitting['add-domain']}
                    />
                    <Button size="icon" onClick={handleAddDomain} disabled={isSubmitting['add-domain']}>
                        {isSubmitting['add-domain'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save/>}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setAddingDomain(false)}><X/></Button>
                </div>
            )}
            </div>
        )}
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="text-primary"/> Special Roles</CardTitle>
          <CardDescription>These users have elevated privileges across all domains.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {isSuperAdmin && (
              <>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">Super Admins</h4>
                        <Button variant="ghost" size="icon" onClick={() => { setAddingRole('super-admin'); setNewSpecialRoleEmail('')}}>
                            <PlusCircle className="h-4 w-4"/>
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(specialRolesConfig).filter(([,role]) => role === 'super-admin').map(([email]) => (
                            <Badge key={email} variant="destructive" className="flex items-center gap-2">
                                {email}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button disabled={isSubmitting['special-roles']}>
                                            <Trash2 className="h-3 w-3 hover:text-white/80" />
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will remove <span className='font-bold'>{email}</span> from the Super Admin role. They will lose all super admin privileges.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleRemoveSpecialRole(email)}>Confirm</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </Badge>
                        ))}
                        {Object.entries(specialRolesConfig).filter(([,role]) => role === 'super-admin').length === 0 && <p className="text-xs text-muted-foreground">No super admins assigned.</p>}
                    </div>
                    {addingRole === 'super-admin' && (
                        <div className="flex gap-2 mt-2">
                            <Input 
                                value={newSpecialRoleEmail}
                                placeholder="super.admin@example.com"
                                onChange={(e) => setNewSpecialRoleEmail(e.target.value)}
                                disabled={isSubmitting['special-roles']}
                            />
                            <Button size="icon" onClick={handleAddSpecialRole} disabled={isSubmitting['special-roles']}>
                                {isSubmitting['special-roles'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save/>}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setAddingRole(null)}><X/></Button>
                        </div>
                    )}
                </div>
                <Separator />
              </>
            )}
             <div>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Admins</h4>
                     {isSuperAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => { setAddingRole('admin'); setNewSpecialRoleEmail('')}}>
                           <PlusCircle className="h-4 w-4"/>
                       </Button>
                     )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(specialRolesConfig).filter(([,role]) => role === 'admin').map(([email]) => (
                        <Badge key={email} variant="secondary" className="flex items-center gap-2">
                            {email}
                           {isSuperAdmin && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button disabled={isSubmitting['special-roles']}>
                                        <Trash2 className="h-3 w-3 hover:text-black/80" />
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will remove <span className='font-bold'>{email}</span> from the Admin role. They will lose all admin privileges.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveSpecialRole(email)}>Confirm</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                           )}
                        </Badge>
                    ))}
                    {Object.entries(specialRolesConfig).filter(([,role]) => role === 'admin').length === 0 && <p className="text-xs text-muted-foreground">No admins assigned.</p>}
                </div>
                 {addingRole === 'admin' && (
                    <div className="flex gap-2 mt-2">
                        <Input 
                            value={newSpecialRoleEmail}
                            placeholder="admin@example.com"
                            onChange={(e) => setNewSpecialRoleEmail(e.target.value)}
                            disabled={isSubmitting['special-roles']}
                        />
                        <Button size="icon" onClick={handleAddSpecialRole} disabled={isSubmitting['special-roles']}>
                            {isSubmitting['special-roles'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save/>}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setAddingRole(null)}><X/></Button>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
        {domainConfig.map((config) => (
          <Card key={config.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-center gap-2 font-headline">{config.id}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4"/>
                      <span className="sr-only">Manage Domain</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(`/dashboard?domain=${config.id}`)}>
                      <Edit className="mr-2 h-4 w-4"/>
                      View & Manage Tasks
                    </DropdownMenuItem>
                    {isSuperAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onSelect={(e) => e.preventDefault()}
                            >
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Delete Domain
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the <strong>{config.id}</strong> domain and all of its associated tasks.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteDomain(config.id)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription>Manage the members and leads of the {config.id} domain.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><User className="text-primary"/> Domain Leads ({config.leads.length})</h4>
                    <Button variant="ghost" size="icon" onClick={() => setAddingLead(config.id)}>
                        <PlusCircle className="h-4 w-4"/>
                    </Button>
                </div>
                <div className="space-y-2">
                    {config.leads.map(lead => (
                        <div key={lead} className="flex items-center justify-between bg-secondary/50 p-2 rounded-md">
                            <span className="text-sm">{lead}</span>
                            <div className="flex items-center gap-1">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isSubmitting[config.id] || !lead}>
                                            <KeyRound className="text-muted-foreground h-4 w-4"/>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Send Password Reset?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will send a password reset link to <span className='font-bold'>{lead}</span>. They will be able to reset their password.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handlePasswordReset(lead)}>Confirm</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isSubmitting[config.id]}>
                                            <Trash2 className="text-destructive h-4 w-4"/>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will remove <span className='font-bold'>{lead}</span> as a lead from the {config.id} domain.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleRemoveLead(config.id, lead)}>Confirm</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))}
                    {config.leads.length === 0 && <p className="text-sm text-muted-foreground">No leads assigned.</p>}
                </div>

                {addingLead === config.id && (
                    <div className="flex gap-2 mt-2">
                        <Input 
                            value={newLeadEmail[config.id] || ''}
                            placeholder="lead.email@example.com"
                            onChange={(e) => setNewLeadEmail(prev => ({...prev, [config.id]: e.target.value}))}
                            disabled={isSubmitting[config.id]}
                        />
                        <Button size="icon" onClick={() => handleAddLead(config.id)} disabled={isSubmitting[config.id]}>
                            {isSubmitting[config.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save/>}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setAddingLead(null)}><X/></Button>
                    </div>
                )}
              </div>
              <Separator/>
              <div>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Users className="text-primary"/> Members ({config.members.length})</h4>
                     <Button variant="ghost" size="icon" onClick={() => setAddingMember(config.id)}>
                        <PlusCircle className="h-4 w-4"/>
                    </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {config.members.length > 0 ? (
                    config.members.map((member) => (
                      <div key={member} className="flex items-center justify-between bg-secondary/50 p-2 rounded-md">
                        <span className="text-sm">{member}</span>
                         <div className="flex items-center gap-1">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isSubmitting[config.id] || !member}>
                                            <KeyRound className="text-muted-foreground h-4 w-4"/>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Send Password Reset?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will send a password reset link to <span className='font-bold'>{member}</span>. They will be able to reset their password.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handlePasswordReset(member)}>Confirm</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isSubmitting[config.id]}>
                                            <Trash2 className="text-destructive h-4 w-4"/>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action will remove <span className='font-bold'>{member}</span> from the {config.id} domain.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleRemoveMember(config.id, member)}>Confirm</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No members in this domain yet.</p>
                  )}
                </div>
                 {addingMember === config.id && (
                    <div className="flex gap-2 mt-2">
                        <Input 
                            value={newMemberEmail[config.id] || ''}
                            placeholder="member.email@example.com"
                            onChange={(e) => setNewMemberEmail(prev => ({...prev, [config.id]: e.target.value}))}
                            disabled={isSubmitting[config.id]}
                        />
                        <Button size="icon" onClick={() => handleAddMember(config.id)} disabled={isSubmitting[config.id]}>
                             {isSubmitting[config.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save/>}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setAddingMember(null)}><X/></Button>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
