'use client';

import * as React from 'react';
import { domainConfig, specialRolesConfig } from '@/lib/domain-config';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, User, Users, Shield, Save, Trash2, Edit, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function ManagePermissionsPage() {
  const [isSubmitting, setIsSubmitting] = React.useState<Record<string, boolean>>({});
  const [newMemberEmail, setNewMemberEmail] = React.useState<Record<string, string>>({});
  const [editingLead, setEditingLead] = React.useState<string | null>(null);
  const [newLeadEmail, setNewLeadEmail] = React.useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleApiCall = async (body: any) => {
    const domain = body.domain;
    setIsSubmitting(prev => ({ ...prev, [domain]: true }));

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
        description: result.message,
      });

      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [domain]: false }));
      setEditingLead(null);
    }
  };

  const handleAddMember = (domainName: string) => {
    const email = newMemberEmail[domainName];
    if (!email || !email.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Email cannot be empty.' });
      return;
    }
    handleApiCall({ action: 'add-member', domain: domainName, email });
    setNewMemberEmail(prev => ({ ...prev, [domainName]: '' }));
  };

  const handleRemoveMember = (domainName: string, email: string) => {
    handleApiCall({ action: 'remove-member', domain: domainName, email });
  };
  
  const handleUpdateLead = (domainName: string) => {
    const email = newLeadEmail[domainName];
    if (!email || !email.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Lead email cannot be empty.' });
      return;
    }
    handleApiCall({ action: 'update-lead', domain: domainName, newLeadEmail: email });
  };


  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Permissions</h1>
          <p className="text-muted-foreground">View special roles and manage domain members and leads.</p>
        </div>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="text-primary"/> Special Roles</CardTitle>
          <CardDescription>These users have elevated privileges across all domains.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <h4 className="font-semibold text-sm mb-2">Super Admins</h4>
                {Object.entries(specialRolesConfig).filter(([,role]) => role === 'super-admin').map(([email]) => (
                     <Badge key={email} variant="destructive" className="mr-2">{email}</Badge>
                ))}
            </div>
            <Separator />
             <div>
                <h4 className="font-semibold text-sm mb-2">Admins</h4>
                {Object.entries(specialRolesConfig).filter(([,role]) => role === 'admin').map(([email]) => (
                     <Badge key={email} variant="secondary" className="mr-2">{email}</Badge>
                ))}
            </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
        {Object.entries(domainConfig).map(([domainName, config]) => (
          <Card key={domainName} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">{domainName}</CardTitle>
              <CardDescription>Manage the members and lead of the {domainName} domain.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center justify-between"><span className='flex items-center gap-2'><User className="text-primary"/> Domain Lead</span></h4>
                {editingLead === domainName ? (
                    <div className="flex gap-2">
                        <Input 
                            defaultValue={config.lead}
                            onChange={(e) => setNewLeadEmail(prev => ({...prev, [domainName]: e.target.value}))}
                            disabled={isSubmitting[domainName]}
                        />
                        <Button size="icon_sm" onClick={() => handleUpdateLead(domainName)} disabled={isSubmitting[domainName]}>
                            <Save/>
                        </Button>
                        <Button size="icon_sm" variant="ghost" onClick={() => setEditingLead(null)}><X/></Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <Badge variant="outline">{config.lead}</Badge>
                        <Button variant="ghost" size="icon_sm" onClick={() => { setEditingLead(domainName); setNewLeadEmail(prev => ({...prev, [domainName]: config.lead}))}}>
                            <Edit className="h-4 w-4"/>
                        </Button>
                    </div>
                )}
              </div>
              <Separator/>
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Users className="text-primary"/> Members ({config.members.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {config.members.length > 0 ? (
                    config.members.map((member) => (
                      <div key={member} className="flex items-center justify-between bg-secondary/50 p-2 rounded-md">
                        <span className="text-sm">{member}</span>
                         <Button variant="ghost" size="icon_sm" onClick={() => handleRemoveMember(domainName, member)} disabled={isSubmitting[domainName]}>
                            <Trash2 className="text-destructive h-4 w-4"/>
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No members in this domain yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="new.member@example.com"
                  value={newMemberEmail[domainName] || ''}
                  onChange={(e) => setNewMemberEmail(prev => ({ ...prev, [domainName]: e.target.value }))}
                  disabled={isSubmitting[domainName]}
                />
                <Button onClick={() => handleAddMember(domainName)} disabled={isSubmitting[domainName] || editingLead === domainName} className="w-full sm:w-auto">
                  {isSubmitting[domainName] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2" />}
                  Add Member
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
