
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, AlertCircle, User, Shield, Briefcase, Power, Upload } from 'lucide-react';
import type { Log } from '@/lib/logger';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const categoryIcons: Record<Log['category'], React.ReactNode> = {
    'Authentication': <User className="h-4 w-4" />,
    'Task Management': <Briefcase className="h-4 w-4" />,
    'Permissions': <Shield className="h-4 w-4" />,
    'Domain Management': <Database className="h-4 w-4" />,
    'Site Status': <Power className="h-4 w-4" />,
    'Submissions': <Upload className="h-4 w-4" />,
    'Error': <AlertCircle className="h-4 w-4" />,
};

const categoryColors: Record<Log['category'], string> = {
    'Authentication': 'bg-blue-500/20 text-blue-700 border-blue-400',
    'Task Management': 'bg-green-500/20 text-green-700 border-green-400',
    'Permissions': 'bg-purple-500/20 text-purple-700 border-purple-400',
    'Domain Management': 'bg-indigo-500/20 text-indigo-700 border-indigo-400',
    'Site Status': 'bg-red-500/20 text-red-700 border-red-400',
    'Submissions': 'bg-yellow-500/20 text-yellow-700 border-yellow-400',
    'Error': 'bg-destructive/20 text-destructive-foreground',
};


export default function LogsPage() {
    const [logs, setLogs] = React.useState<Log[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        const logsQuery = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(logsQuery, 
            (snapshot) => {
                const logsData = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                } as Log));
                setLogs(logsData);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching logs:", error);
                toast({
                    variant: 'destructive',
                    title: 'Failed to load logs',
                    description: 'Could not retrieve activity logs. Please try again later.',
                });
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [toast]);

    if (isLoading) {
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
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Database/> Activity Logs</h1>
                <p className="text-muted-foreground">A real-time stream of all activities happening across the application.</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                 {logs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No activity has been logged yet.</p>
                    </div>
                ) : (
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg bg-card shadow-sm">
                            <div className={`p-2 rounded-full ${categoryColors[log.category]}`}>
                                {categoryIcons[log.category]}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-card-foreground">{log.message}</p>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                                     <span>
                                        By: <span className="font-semibold">{log.user?.name || log.user?.email || 'System'}</span>
                                    </span>
                                    {log.timestamp && (
                                        <span title={format( (log.timestamp as Timestamp).toDate(), 'PPpp' )}>
                                            {formatDistanceToNow((log.timestamp as Timestamp).toDate(), { addSuffix: true })}
                                        </span>
                                    )}
                                </div>
                            </div>
                             <Badge variant="outline" className={`${categoryColors[log.category]}`}>{log.category}</Badge>
                        </div>
                    ))}
                </div>
                 )}
            </div>
        </div>
    )
}
