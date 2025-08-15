
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { seedDatabase } from '@/lib/seed-db';
import { Loader2 } from 'lucide-react';

export default function ManageRolesPage() {
  const [isSeeding, setIsSeeding] = React.useState(false);
  const { toast } = useToast();

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const result = await seedDatabase();
      toast({
        title: 'Database Seeding',
        description: result.message,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: (error as Error).message,
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
       <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Roles</h1>
          <p className="text-muted-foreground">This page is for database administration.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Seed Database</CardTitle>
          <CardDescription>
            This action will populate your Firestore database with the initial domain and role configurations. 
            It is designed to run only once. If the data already exists, the script will not make any changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Seed Database
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
