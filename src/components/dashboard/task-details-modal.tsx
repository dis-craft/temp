'use client';

import * as React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { Task, User, Comment as CommentType, Submission } from '@/lib/types';
import { FileText, MessageCircle, Upload, Calendar, Users, Paperclip, Loader2, Pencil } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { generatePresignedUrl } from '@/ai/flows/generate-presigned-url';
import { EditTaskModal } from './edit-task-modal';

interface TaskDetailsModalProps {
  task: Task;
  currentUser: User;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  allUsers: User[];
  onUpdateTask: (taskId: string, updatedData: Partial<Omit<Task, 'id'>>) => void;
}

export function TaskDetailsModal({ task, currentUser, isOpen, setIsOpen, allUsers, onUpdateTask }: TaskDetailsModalProps) {
  const { toast } = useToast();
  const [commentText, setCommentText] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [isEditModalOpen, setEditModalOpen] = React.useState(false);
  
  const canEditTask = currentUser.role === 'super-admin' || currentUser.role === 'admin' || currentUser.role === 'domain-lead';

  if (!task) return null;

  const assignees = task.assignees || [];

  const handlePostComment = async () => {
    if (!commentText.trim()) return;

    const newComment: CommentType = {
      id: `comment-${Date.now()}`,
      text: commentText,
      author: currentUser,
      timestamp: new Date().toISOString(),
    };

    const taskRef = doc(db, 'tasks', task.id);
    await updateDoc(taskRef, {
      comments: arrayUnion(newComment)
    });
    setCommentText('');
    toast({ title: "Comment posted!" });
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { url, key } = await generatePresignedUrl({
        filename: file.name,
        contentType: file.type,
      });

      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error('File upload failed.');
      }
      
      const newSubmission: Submission = {
        id: `sub-${Date.now()}`,
        author: currentUser,
        file: key,
        timestamp: new Date().toISOString(),
        qualityScore: 0,
      };
      
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        submissions: arrayUnion(newSubmission)
      });

      toast({ title: "File submitted!" });
    } catch (error) {
       console.error('Upload error:', error);
       toast({
         variant: 'destructive',
         title: 'Upload Failed',
         description: 'Could not upload the file. Please try again.',
       });
    } finally {
        setIsUploading(false);
    }
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="font-headline text-2xl pr-12">{task.title}</DialogTitle>
            {canEditTask && (
                <Button variant="outline" size="icon" onClick={() => { setIsOpen(false); setEditModalOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit Task</span>
                </Button>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground pt-1">
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Due on {format(new Date(task.dueDate), 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{assignees.length} Assignees</span>
            </div>
            {task.attachment && (
                <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    <span>Attachment Included</span>
                </div>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden">
          <Tabs defaultValue="details" className="h-full flex flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="flex-grow overflow-y-auto mt-4 pr-4">
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg font-headline">Task Description</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{task.description}</p>
                  </CardContent>
                </Card>
                {task.attachment && (
                  <Card>
                     <CardHeader><CardTitle className="text-lg font-headline">Attachment</CardTitle></CardHeader>
                     <CardContent>
                        <div className="flex items-center p-4 border rounded-md">
                            <FileText className="h-10 w-10 mr-4 text-primary" />
                            <div className="flex-grow">
                                <p className="font-medium">{task.attachment}</p>
                                <p className="text-sm text-muted-foreground">PDF Document</p>
                            </div>
                            <Button variant="outline">Download</Button>
                        </div>
                     </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
            <TabsContent value="comments" className="flex-grow overflow-y-auto mt-4">
              <div className="space-y-4 pr-4">
                {task.comments.map(comment => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author.avatarUrl || undefined} />
                      <AvatarFallback>{comment.author.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-semibold">{comment.author.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}</span>
                      </div>
                      <p className="text-sm text-muted-foreground bg-secondary p-2 rounded-md mt-1">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pr-4">
                <Separator className="my-4" />
                <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={currentUser.avatarUrl || undefined} />
                      <AvatarFallback>{currentUser.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <Textarea 
                          placeholder="Write a comment..." 
                          className="mb-2"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                        />
                        <Button size="sm" onClick={handlePostComment}>Post Comment</Button>
                    </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="submissions" className="flex-grow overflow-y-auto mt-4 pr-4">
                {(currentUser.role === "domain-lead" || currentUser.role === "admin" || currentUser.role === 'super-admin') ? (
                     <div className="space-y-4">
                        {task.submissions.map(submission => (
                        <Card key={submission.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center">
                                <Avatar className="h-10 w-10 mr-4">
                                <AvatarImage src={submission.author.avatarUrl || undefined} />
                                <AvatarFallback>{submission.author.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                <p className="font-semibold">{submission.author.name}</p>
                                <p className="text-sm text-muted-foreground">{submission.file}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 w-1/3">
                                <Slider defaultValue={[submission.qualityScore || 0]} max={100} step={1} />
                                <Badge variant="secondary" className="w-16 justify-center">{submission.qualityScore || 0}%</Badge>
                                <Button variant="outline" size="sm">Review</Button>
                            </div>
                            </CardContent>
                        </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle className="text-lg font-headline">Submit Your Work</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg">
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin"/>
                                        <p className="font-semibold">Uploading...</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-12 w-12 text-muted-foreground mb-4"/>
                                        <Label htmlFor="submission-file" className="mb-2 text-center">
                                            <p className="font-semibold">Drag & drop your PDF here</p>
                                            <p className="text-sm text-muted-foreground">or click to browse</p>
                                        </Label>
                                        <Input id="submission-file" type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                                        <Button asChild className="mt-4 cursor-pointer">
                                            <label htmlFor="submission-file">Upload PDF</label>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
    <EditTaskModal 
        isOpen={isEditModalOpen} 
        setIsOpen={setEditModalOpen}
        onUpdateTask={onUpdateTask}
        allUsers={allUsers}
        task={task}
    />
    </>
  );
}
