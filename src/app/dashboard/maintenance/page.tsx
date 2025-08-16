/**
 * @fileoverview Maintenance & Security Page Component.
 * @description This is a frontend (FE) file that renders the site maintenance and security control
 * page, which is accessible only to super-admins.
 *
 * How it works:
 * - It fetches and displays the current site status from the `config/siteStatus` document in Firestore.
 * - It allows a super-admin to toggle two main site-wide modes:
 *   1. Emergency Shutdown: Immediately blocks access for all non-admin users.
 *   2. Maintenance Mode: Shows a maintenance page to non-admin users.
 * - An estimated time of completion (ETA) can be set for maintenance mode.
 * - All actions are protected by confirmation dialogs (`AlertDialog`) to prevent accidental changes.
 * - Changes are persisted back to Firestore, and all actions are logged.
 *
 * This component directly interacts with Firestore for real-time status updates and does not
 * need a separate backend API route, as the actions are simple document updates and protected
 * by Firestore Security Rules (implicitly, by being on a client-side admin page).
 *
 * Linked Files:
 * - `src/lib/firebase.ts`: Imports the Firestore database instance (`db`) and auth.
 * - `src/lib/logger.ts`: For logging all status changes.
 * - `src/lib/types.ts`: Imports the `SiteStatus` and `User` types.
 * - `src/hooks/use-toast.ts`: For displaying success or error notifications.
 * - `src/components/ui/*`: Uses various ShadCN components like Card, Switch, Button, AlertDialog.
 *
 * Tech Used:
 * - React: For UI and state management.
 * - Next.js: For the application framework.
 * - Firebase SDK: For real-time data fetching and updates.
 * - ShadCN UI: For the user interface components.
 * - Lucide-React: For icons.
 */
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Hammer, Power } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { SiteStatus, User } from '@/lib/types';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { logActivity } from '@/lib/logger';
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


export default function MaintenancePage() {
    const [siteStatus, setSiteStatus] = React.useState<SiteStatus | null>(null);
    const [currentUser, setCurrentUser] = React.useState<User | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [eta, setEta] = React.useState('');
    const { toast } = useToast();

    React.useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setCurrentUser({ id: user.uid, ...userDoc.data() } as User);
                }
            }
        });
        
        const siteStatusRef = doc(db, 'config', 'siteStatus');
        const unsubscribe = onSnapshot(siteStatusRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as SiteStatus;
                setSiteStatus(data);
                setEta(data.maintenanceETA || '');
            } else {
                // If doesn't exist, create it with default values
                const initialStatus: SiteStatus = { emergencyShutdown: false, maintenanceMode: false };
                setDoc(siteStatusRef, initialStatus);
                setSiteStatus(initialStatus);
            }
            setIsLoading(false);
        });

        return () => {
            unsubAuth();
            unsubscribe();
        };
    }, []);

    const handleToggle = async (mode: 'emergencyShutdown' | 'maintenanceMode', value: boolean) => {
        if (!siteStatus) return;
        setIsSubmitting(true);
        const siteStatusRef = doc(db, 'config', 'siteStatus');

        try {
            const newStatus: Partial<SiteStatus> = { [mode]: value };
            const modeName = mode === 'emergencyShutdown' ? 'Emergency Shutdown' : 'Maintenance Mode';
            
            // If turning on maintenance mode, set the ETA. If turning off, clear it.
            if (mode === 'maintenanceMode') {
                newStatus.maintenanceETA = value ? eta : '';
            }
            await updateDoc(siteStatusRef, newStatus);
            toast({
                title: 'Success!',
                description: `Successfully ${value ? 'enabled' : 'disabled'} ${modeName}.`,
            });
            await logActivity(`${value ? 'Enabled' : 'Disabled'} ${modeName}.`, 'Site Status', currentUser);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Operation Failed',
                description: (error as Error).message,
            });
            await logActivity(`Failed to change site status for ${mode}: ${(error as Error).message}`, 'Error', currentUser);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSetEta = async () => {
        if (!siteStatus || !siteStatus.maintenanceMode) {
             toast({
                variant: 'destructive',
                title: 'Cannot Set ETA',
                description: 'Maintenance mode must be enabled to set an ETA.',
            });
            return;
        }
        setIsSubmitting(true);
        const siteStatusRef = doc(db, 'config', 'siteStatus');
         try {
            await updateDoc(siteStatusRef, { maintenanceETA: eta });
             toast({
                title: 'ETA Updated!',
                description: 'Maintenance completion time has been set.',
            });
            await logActivity(`Set maintenance mode ETA to: "${eta}"`, 'Site Status', currentUser);
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: (error as Error).message,
            });
             await logActivity(`Failed to set ETA: ${(error as Error).message}`, 'Error', currentUser);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading || siteStatus === null) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="w-full h-full flex flex-col space-y-6">
            <header className="flex items-center justify-between pb-4 border-b">
                <div>
                <h1 className="text-3xl font-bold font-headline">Maintenance & Security</h1>
                <p className="text-muted-foreground">Manage site-wide status and emergency controls.</p>
                </div>
            </header>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive"><Power/> Emergency Shutdown</CardTitle>
                        <CardDescription>
                           Immediately disable access for all users except Superadmins and Admins. Use this in case of a critical security issue.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="flex items-center space-x-2">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Switch
                                        id="emergency-shutdown-switch"
                                        checked={siteStatus.emergencyShutdown}
                                        disabled={isSubmitting}
                                        // Use a handler to prevent state change before confirmation
                                        onCheckedChange={(checked) => {}}
                                    />
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You are about to {siteStatus.emergencyShutdown ? 'disable' : 'enable'} Emergency Shutdown. This will {siteStatus.emergencyShutdown ? 'restore' : 'block'} access for most users immediately.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleToggle('emergencyShutdown', !siteStatus.emergencyShutdown)}>Confirm</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Label htmlFor="emergency-shutdown-switch" className={siteStatus.emergencyShutdown ? 'text-destructive' : ''}>
                                {siteStatus.emergencyShutdown ? 'Shutdown Enabled' : 'Shutdown Disabled'}
                            </Label>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Hammer/> Maintenance Mode</CardTitle>
                        <CardDescription>
                          Put the site into maintenance mode. Users will see a maintenance page. You can provide an estimated completion time.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="flex items-center space-x-2">
                          <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Switch
                                    id="maintenance-mode-switch"
                                    checked={siteStatus.maintenanceMode}
                                    disabled={isSubmitting}
                                    onCheckedChange={() => {}}
                                />
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    You are about to {siteStatus.maintenanceMode ? 'disable' : 'enable'} Maintenance Mode.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleToggle('maintenanceMode', !siteStatus.maintenanceMode)}>Confirm</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          <Label htmlFor="maintenance-mode-switch">
                            {siteStatus.maintenanceMode ? 'Maintenance Enabled' : 'Maintenance Disabled'}
                          </Label>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="maintenance-eta">Estimated Completion Time (e.g., "5:00 PM PST")</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="maintenance-eta"
                                    value={eta}
                                    onChange={(e) => setEta(e.target.value)}
                                    placeholder="Inform users when you'll be back"
                                    disabled={isSubmitting || !siteStatus.maintenanceMode}
                                />
                                <Button onClick={handleSetEta} disabled={isSubmitting || !siteStatus.maintenanceMode}>
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Set ETA'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
