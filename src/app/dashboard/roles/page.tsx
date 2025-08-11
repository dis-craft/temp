
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, UserPlus, Loader2, Save, Database } from 'lucide-react';
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
import { seedDatabase } from '@/lib/seed-db';


export default function ManageRolesPage() {
  const [isSeeding, setIsSeeding] = React.useState(false);
  const { toast } = useToast();

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const result = await seedDatabase();
      toast({
        title: "Database Seeding",
        description: result.message,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Error Seeding Database",
        description: error.message,
      });
    } finally {
      setIsSeeding(false);
    }
  };


  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold font-headline">App Database</h1>
          <p className="text-muted-foreground">Manage critical database operations.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database/> Seed Database</CardTitle>
          <CardDescription>
            This is a one-time operation to populate your Firestore database with the initial domain and role configurations. 
            Run this if your permissions page is empty. It is safe to run this multiple times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isSeeding}>
                  {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2" />}
                  Seed Database
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will populate the `domains` and `config` collections in your Firestore database. 
                    Running this on an already seeded database is safe and will not duplicate data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSeed}>
                    Yes, Seed Database
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>

    </div>
  );
}



