'use client';

import * as React from 'react';
import { domainConfig } from '@/lib/domain-config';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function ManageDomainsPage() {
  const [isSubmitting, setIsSubmitting] = React.useState<Record<string, boolean>>({});
  const [newMemberEmail, setNewMemberEmail] = React.useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleAddMember = async (domainName: string) => {
    const email = newMemberEmail[domainName];
    if (!email || !email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Email address cannot be empty.',
      });
      return;
    }

    setIsSubmitting(prev => ({ ...prev, [domainName]: true }));

    try {
      const response = await fetch('/api/update-domain-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainName, email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add member.');
      }

      toast({
        title: 'Success!',
        description: `${email} has been added to the ${domainName} domain. The application will now reload to apply the changes.`,
      });

      // Clear input and reload to reflect changes from the config file
      setNewMemberEmail(prev => ({ ...prev, [domainName]: '' }));
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [domainName]: false }));
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Domains</h1>
          <p className="text-muted-foreground">View domain leads and members, and add new members to each domain.</p>
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {Object.entries(domainConfig).map(([domainName, config]) => (
          <Card key={domainName} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">{domainName}</CardTitle>
              <CardDescription>Manage the members of the {domainName} domain.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><User className="text-primary"/> Domain Lead</h4>
                <Badge variant="outline">{config.lead}</Badge>
              </div>
              <Separator/>
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Users className="text-primary"/> Members ({config.members.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {config.members.length > 0 ? (
                    config.members.map((member, index) => (
                      <Badge key={index} variant="secondary" className="mr-2 mb-2">{member}</Badge>
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
                <Button onClick={() => handleAddMember(domainName)} disabled={isSubmitting[domainName]} className="w-full sm:w-auto">
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
