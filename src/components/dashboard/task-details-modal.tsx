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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { Task, User, Comment as CommentType, Submission } from '@/lib/types';
import { FileText, MessageCircle, Upload, Calendar, Users, Paperclip, Loader2, Pencil, Download, Trash2, BellRing, Star, Send } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { EditTaskModal } from './edit-task-modal';
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
import { cn } from '@/lib/utils';


interface TaskDetailsModalProps {
  task: Task;
  currentUser: User;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  allUsers: User[];
  onUpdateTask: (taskId: string, updatedData: Partial<Omit<Task, 'id'>>) => void;
  onDeleteTask: (taskId: string) => void;
}

const StarRating = ({ rating, onRate, readOnly = false }: { rating: number; onRate?: (rating: number) => void, readOnly?: boolean }) => {
  const [hoverRating, setHoverRating] = React.useState(0);

  const getRatingFeedback = (r: number) => {
    if (r === 5) return { text: "Great", className: "text-green-600" };
    if (r === 4) return { text: "Good", className: "text-green-500" };
    if (r === 3) return { text: "Needs Improvement", className: "text-yellow-500" };
    if (r > 0 && r <= 2) return { text: "Redo", className: "text-red-500" };
    return { text: "Not Rated", className: "text-muted-foreground" };
  };

  const feedback = getRatingFeedback(rating);

  return (
    <div className='flex flex-col sm:flex-row items-center gap-2 sm:gap-4'>
        <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
            key={star}
            className={cn(
                "h-5 w-5 cursor-pointer",
                (hoverRating || rating) >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300",
                readOnly && "cursor-default"
            )}
            onClick={() => !readOnly && onRate?.(star)}
            onMouseEnter={() => !readOnly && setHoverRating(star)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
            />
        ))}
        </div>
        <Badge variant="outline" className={cn("w-32 justify-center", feedback.className)}>
            {feedback.text}
        </Badge>
    </div>
  );
};


export function TaskDetailsModal({ task, currentUser, isOpen, setIsOpen, allUsers, onUpdateTask, onDeleteTask }: TaskDetailsModalProps) {
  const { toast } = useToast();
  const [commentText, setCommentText] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [isEditModalOpen, setEditModalOpen] = React.useState(false);
  const [fileToUpload, setFileToUpload] = React.useState<File | null>(null);
  const [isSendingReminder, setIsSendingReminder] = React.useState(false);
  const [remarks, setRemarks] = React.useState<Record<string, string>>({});

  if (!task) return null;

  const assignees = task.assignees || [];
  const userSubmission = task.submissions.find(s => s.author.id === currentUser.id);
  
  const hasPermission = (permission: 'edit_task' | 'review_submissions' | 'submit_work' | 'send_reminders') => {
    if (!currentUser) return false;
    const userRole = currentUser.role;
    switch (permission) {
        case 'edit_task':
        case 'review_submissions':
        case 'send_reminders':
            return userRole === 'super-admin' || userRole === 'admin' || userRole === 'domain-lead';
        case 'submit_work':
            return assignees.some(a => a.id === currentUser.id);
        default:
            return false;
    }
  }

  const canEditTask = hasPermission('edit_task');
  const canReviewSubmissions = hasPermission('review_submissions');
  const canSubmitWork = hasPermission('submit_work');
  const canSendReminders = hasPermission('send_reminders');
  
  const handleSendReminder = async () => {
    setIsSendingReminder(true);
    const submittedAssigneeIds = new Set(task.submissions.map(s => s.author.id));
    const unsubmittedMembers = task.assignees.filter(a => !submittedAssigneeIds.has(a.id));

    if (unsubmittedMembers.length === 0) {
      toast({ title: 'All members have submitted their work.' });
      setIsSendingReminder(false);
      return;
    }

    try {
      const response = await fetch('/api/send-reminder-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          unsubmittedMembers,
          domainLeadEmail: currentUser.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reminder.');
      }
      
      toast({ title: 'Reminder Sent!', description: 'Emails have been sent to unsubmitted members.' });

    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        variant: 'destructive',
        title: 'Reminder Failed',
        description: (error as Error).message,
      });
    } finally {
      setIsSendingReminder(false);
    }
  };


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
  
  const handleFileUpload = async () => {
    if (!fileToUpload) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'X-Custom-Auth-Key': process.env.NEXT_PUBLIC_JWT_SECRET || '',
            },
            body: formData,
        });

        if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || 'File upload failed');
        }

        const result = await response.json();

        const newSubmission: Submission = {
            id: `sub-${Date.now()}`,
            author: currentUser,
            file: result.filePath,
            timestamp: new Date().toISOString(),
            qualityScore: 0,
        };
        
        const taskRef = doc(db, 'tasks', task.id);
        await updateDoc(taskRef, {
            submissions: arrayUnion(newSubmission)
        });

        toast({ title: "File submitted successfully!" });

    } catch (error) {
       console.error('Upload error:', error);
       toast({
         variant: 'destructive',
         title: 'Upload Failed',
         description: (error as Error).message || 'Could not upload the file. Please try again.',
       });
    } finally {
        setIsUploading(false);
        setFileToUpload(null);
    }
  }

  const handleDeleteSubmission = async (submission: Submission) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        submissions: arrayRemove(submission)
      });
      toast({
        title: 'Submission Deleted',
        description: 'Your submission has been successfully removed.',
      });
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Could not delete the submission. Please try again.',
      });
    }
  };

  const handleRatingAndRemarks = async (submissionId: string, rating?: number, remark?: string) => {
    const taskRef = doc(db, 'tasks', task.id);
    const updatedSubmissions = task.submissions.map(sub => {
        if (sub.id === submissionId) {
            return {
                ...sub,
                qualityScore: rating !== undefined ? rating : sub.qualityScore,
                remarks: remark !== undefined ? remark : sub.remarks,
            };
        }
        return sub;
    });

    try {
        await updateDoc(taskRef, { submissions: updatedSubmissions });
        if (rating !== undefined) {
             toast({ title: 'Rating Saved', description: `You've rated this submission ${rating} out of 5 stars.` });
        }
        if (remark !== undefined) {
             toast({ title: 'Remarks Saved', description: 'Your feedback has been saved.' });
        }
    } catch (error) {
        console.error('Error saving feedback:', error);
        toast({
            variant: 'destructive',
            title: 'Feedback Failed',
            description: 'Could not save the feedback. Please try again.',
        });
    }
  };


  const handleDownload = async (fileKey?: string) => {
    if (!fileKey) return;
    const workerUrl = process.env.NEXT_PUBLIC_R2_WORKER_URL;
    if (workerUrl) {
      window.open(`${workerUrl}/${fileKey}`, '_blank');
    } else {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Worker URL is not configured.',
      });
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) setFileToUpload(null); setIsOpen(open); }}>
      <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start flex-wrap gap-2">
            <DialogTitle className="font-headline text-2xl pr-12">{task.title}</DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {canSendReminders && (
                <Button variant="outline" size="sm" onClick={handleSendReminder} disabled={isSendingReminder}>
                  {isSendingReminder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                  Remind
                </Button>
              )}
              {canEditTask && (
                  <Button variant="outline" size="icon" onClick={() => { setIsOpen(false); setEditModalOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit Task</span>
                  </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center space-x-4 text-sm text-muted-foreground pt-1">
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
                    <span>Attachment</span>
                </div>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden">
          <Tabs defaultValue="details" className="h-full flex flex-col">
            <TabsList className="shrink-0 w-full justify-start overflow-x-auto -mx-1 px-1">
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
                                <p className="font-medium break-all">{task.attachment}</p>
                                <p className="text-sm text-muted-foreground">PDF Document</p>
                            </div>
                            <Button variant="outline" onClick={() => handleDownload(task.attachment)}>
                              <Download className="mr-2 h-4 w-4"/>
                              Download
                            </Button>
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
            <TabsContent value="submissions" className="flex-grow overflow-y-auto mt-4 pr-4 space-y-6">
                {canReviewSubmissions && (
                     <div className="space-y-4">
                        {task.submissions.length === 0 && <p className="text-muted-foreground text-center">No submissions yet.</p>}
                        {task.submissions.map(submission => (
                        <Card key={submission.id}>
                            <CardContent className="p-4">
                               <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
                                    <div className="flex items-center">
                                        <Avatar className="h-10 w-10 mr-4">
                                        <AvatarImage src={submission.author.avatarUrl || undefined} />
                                        <AvatarFallback>{submission.author.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                        <p className="font-semibold">{submission.author.name}</p>
                                        <p className="text-sm text-muted-foreground break-all">{submission.file}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => handleDownload(submission.file)}>
                                      <Download className="mr-2 h-4 w-4"/>
                                      View Submission
                                    </Button>
                               </div>
                               <Separator className="my-4" />
                               <div className="space-y-4">
                                  <Label>Rate Submission</Label>
                                  <StarRating rating={submission.qualityScore || 0} onRate={(rating) => handleRatingAndRemarks(submission.id, rating)} />

                                  <Label htmlFor={`remarks-${submission.id}`}>Write Remarks</Label>
                                  <div className="flex gap-2">
                                     <Textarea
                                      id={`remarks-${submission.id}`}
                                      placeholder="Provide detailed feedback..."
                                      defaultValue={submission.remarks || ''}
                                      onChange={(e) => setRemarks(prev => ({ ...prev, [submission.id]: e.target.value }))}
                                    />
                                    <Button size="icon" onClick={() => handleRatingAndRemarks(submission.id, undefined, remarks[submission.id])} aria-label="Submit Remarks">
                                        <Send/>
                                    </Button>
                                  </div>
                               </div>
                            </CardContent>
                        </Card>
                        ))}
                    </div>
                )}
                
                {canSubmitWork && !canReviewSubmissions && (
                  <>
                    {userSubmission ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg font-headline">Your Submission</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-md">
                               <div className="flex items-center gap-3">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                                <div>
                                    <span className="text-sm font-medium break-all">{userSubmission.file}</span>
                                    <p className='text-xs text-muted-foreground'>Submitted {formatDistanceToNow(new Date(userSubmission.timestamp), { addSuffix: true })}</p>
                                </div>
                               </div>
                               <div className="flex items-center gap-2 shrink-0">
                                  <Button variant="outline" size="sm" onClick={() => handleDownload(userSubmission.file)}>
                                    <Download className="mr-2 h-4 w-4"/>
                                    View
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon_sm">
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete your submission.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteSubmission(userSubmission)}>
                                        Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                               </div>
                            </div>
                            <div>
                                <Label>Feedback & Rating</Label>
                                <div className="p-3 border rounded-md mt-2 space-y-2">
                                    <StarRating rating={userSubmission.qualityScore || 0} readOnly={true} />
                                    {userSubmission.remarks && (
                                        <>
                                            <Separator/>
                                            <div className="space-y-1">
                                                <p className='text-sm font-medium'>Remarks from Lead:</p>
                                                <p className="text-sm text-muted-foreground p-2 bg-secondary rounded-md">{userSubmission.remarks}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                      </Card>
                    ) : (
                    <Card>
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
                                        <Label htmlFor="submission-file" className="mb-2 text-center cursor-pointer">
                                            <p className="font-semibold">Drag & drop your PDF here</p>
                                            <p className="text-sm text-muted-foreground">or click to browse</p>
                                        </Label>
                                        <Input 
                                          id="submission-file" 
                                          type="file" 
                                          accept=".pdf" 
                                          className="hidden" 
                                          onChange={(e) => setFileToUpload(e.target.files?.[0] || null)} 
                                        />
                                        {fileToUpload && (
                                            <div className="mt-4 text-center">
                                                <p className="text-sm font-medium break-all">Selected: {fileToUpload.name}</p>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button className="mt-2">Upload PDF</Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to submit the file: <span className="font-semibold break-all">{fileToUpload?.name}</span>?
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel onClick={() => setFileToUpload(null)}>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={handleFileUpload}>
                                                            Confirm & Submit
                                                        </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    )}
                  </>
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
        onDeleteTask={onDeleteTask}
        allUsers={allUsers}
        task={task}
        currentUser={currentUser}
    />
    </>
  );
}
