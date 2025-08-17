/**
 * @fileoverview Profile Settings Modal Component.
 * @description This is a frontend (FE) file that provides a modal for users to manage their
 * own profile information.
 *
 * How it works:
 * - It uses a `Tabs` component to separate "Profile" settings from "Security" settings.
 * - **Profile Tab**:
 *   - Displays the user's current avatar and name.
 *   - Allows uploading a new avatar image. The upload is handled by calling the `/api/upload`
 *     endpoint, which returns a file path.
 *   - Allows changing the display name.
 *   - Submitting the form calls the `/api/update-profile` endpoint to persist changes.
 * - **Security Tab**:
 *   - If the user signed in with email/password, it shows a "Send Password Reset" button that
 *     calls the `sendPasswordReset` function from `src/lib/firebase.ts`.
 *   - If the user signed in with Google, it displays a message informing them to manage their
 *     password through their Google account.
 *
 * This component provides a comprehensive, self-service interface for account management.
 *
 * Linked Files:
 * - `src/lib/firebase.ts`: Imports the `auth` and `sendPasswordReset` functions.
 * - `src/lib/types.ts`: Imports the `User` type definition.
 * - `src/hooks/use-toast.ts`: For displaying success or error notifications.
 * - `/api/update-profile/route.ts`: The API for saving profile changes.
 * - `/api/upload/route.ts`: The API for handling avatar image uploads.
 * - `src/app/dashboard/layout.tsx`: This modal is rendered and controlled by the dashboard layout.
 *
 * Tech Used:
 * - React: For UI and state management.
 * - ShadCN UI: For `Dialog`, `Tabs`, `Form`, `Input`, `Button`, `Avatar`, etc.
 * - Zod / react-hook-form: For form validation.
 */
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/lib/types';
import { auth, sendPasswordReset } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { logActivity } from '@/lib/logger';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  avatarFile: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileSettingsModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: User;
}

export function ProfileSettingsModal({ isOpen, setIsOpen, user }: ProfileSettingsModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("profile");
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || '',
      avatarFile: undefined,
    },
  });

  const avatarFileRef = form.register("avatarFile");
  const [preview, setPreview] = React.useState(user.avatarUrl);

  React.useEffect(() => {
    if (isOpen) {
      form.reset({ name: user.name || '' });
      setPreview(user.avatarUrl);
    }
  }, [isOpen, user, form]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'X-Custom-Auth-Key': process.env.NEXT_PUBLIC_JWT_SECRET || '' },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'File upload failed');
      }

      const result = await response.json();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      return `${appUrl}/api/download/${result.filePath}`;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: (error as Error).message,
      });
      return null;
    }
  };

  const handleSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    let avatarUrl = user.avatarUrl;

    if (data.avatarFile && data.avatarFile[0]) {
      const uploadedUrl = await uploadFile(data.avatarFile[0]);
      if (uploadedUrl) {
        avatarUrl = uploadedUrl;
      } else {
        setIsSubmitting(false);
        return; // Stop if upload failed
      }
    }

    try {
      const response = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ name: data.name, avatarUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile.');
      }
      
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
      await logActivity('User updated their profile', 'Authentication', user);
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (!user.email) {
      toast({ variant: "destructive", title: "Cannot reset password without an email."});
      return;
    }
    setIsSubmitting(true);
    try {
      await sendPasswordReset(user.email);
      toast({
        title: "Password Reset Email Sent",
        description: `A link to reset your password has been sent to ${user.email}.`,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Failed to send reset email",
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGoogleUser = auth.currentUser?.providerData.some(p => p.providerId === 'google.com');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Profile Settings</DialogTitle>
          <DialogDescription>Manage your account settings and preferences.</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
                <FormField
                  control={form.control}
                  name="avatarFile"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormLabel htmlFor='avatar-upload' className='cursor-pointer'>
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={preview || undefined} />
                          <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </FormLabel>
                      <FormControl>
                         <Input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            {...avatarFileRef}
                            onChange={(e) => {
                                field.onChange(e.target.files);
                                handleFileChange(e);
                            }}
                          />
                      </FormControl>
                       <Button type="button" size="sm" variant="link" asChild>
                         <Label htmlFor='avatar-upload' className="cursor-pointer">
                           Change Picture
                         </Label>
                       </Button>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />
                
                <div className="space-y-2">
                    <h4 className="font-medium text-sm">Account Information</h4>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Role</span>
                        <Badge variant="secondary">{user.role}</Badge>
                    </div>
                     <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Domain</span>
                        <Badge variant="secondary">{user.domain || 'N/A'}</Badge>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="security">
            <div className="space-y-6 py-4">
                <div className="space-y-2">
                    <h4 className="font-medium">Password Management</h4>
                    <p className="text-sm text-muted-foreground">
                        {isGoogleUser
                        ? "You are signed in with Google. To change your password, please visit your Google Account settings."
                        : "To change your password, we'll send a secure link to your email."}
                    </p>
                </div>
                 {!isGoogleUser && (
                    <Button onClick={handlePasswordReset} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4"/>}
                        Send Password Reset Email
                    </Button>
                 )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
