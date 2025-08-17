/**
 * @fileoverview Activity Logs Page Component.
 * @description This is a frontend (FE) file that renders the Activity Logs page, which is
 * accessible only to super-admins. It displays a paginated and filterable audit trail of
 * significant actions across the application.
 *
 * How it works:
 * - It uses Firestore's `onSnapshot` to listen for real-time updates to the `logs` collection.
 * - It implements filtering by user email, log category, and a date range.
 * - It handles pagination using Firestore cursors (`startAfter`, `endBefore`) to efficiently
 *   load logs page by page.
 * - It provides a feature to export the currently viewed logs to a CSV file.
 * - It uses custom icons and colors to visually distinguish between different log categories.
 *
 * Linked Files:
 * - `src/lib/firebase.ts`: Imports the Firestore database instance (`db`).
 * - `src/lib/logger.ts`: Imports the `Log` and `LogCategory` type definitions.
 * - `src/hooks/use-toast.ts`: For displaying notifications.
 * - `src/components/ui/*`: Uses various ShadCN components for UI elements like Table, Card,
 *   Input, Select, Popover, Calendar, etc.
 *
 * Tech Used:
 * - React: For UI and state management.
 * - Next.js: For the application framework.
 * - Firebase SDK: For real-time queries, pagination, and data fetching from Firestore.
 * - date-fns: For formatting timestamps.
 * - ShadCN UI: For building the user interface.
 * - Lucide-React: For icons.
 */
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, where, limit, startAfter, endBefore, limitToLast, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, AlertCircle, User, Shield, Briefcase, Power, Upload, Calendar as CalendarIcon, Search, ChevronsRight, ChevronsLeft, Download, XCircle } from 'lucide-react';
import type { Log } from '@/lib/logger';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogCategory } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';


const categoryIcons: Record<LogCategory, React.ReactNode> = {
    'Authentication': <User className="h-4 w-4" />,
    'Task Management': <Briefcase className="h-4 w-4" />,
    'Permissions': <Shield className="h-4 w-4" />,
    'Domain Management': <Database className="h-4 w-4" />,
    'Site Status': <Power className="h-4 w-4" />,
    'Submissions': <Upload className="h-4 w-4" />,
    'Error': <AlertCircle className="h-4 w-4" />,
    'Announcements': <AlertCircle className="h-4 w-4" />,
    'Documentation Hub': <AlertCircle className="h-4 w-4" />,
    'Suggestions': <AlertCircle className="h-4 w-4" />,
};

const categoryColors: Record<LogCategory, string> = {
    'Authentication': 'bg-blue-500/20 text-blue-700 border-blue-400',
    'Task Management': 'bg-green-500/20 text-green-700 border-green-400',
    'Permissions': 'bg-purple-500/20 text-purple-700 border-purple-400',
    'Domain Management': 'bg-indigo-500/20 text-indigo-700 border-indigo-400',
    'Site Status': 'bg-red-500/20 text-red-700 border-red-400',
    'Submissions': 'bg-yellow-500/20 text-yellow-700 border-yellow-400',
    'Error': 'bg-destructive/20 text-destructive-foreground',
    'Announcements': 'bg-pink-500/20 text-pink-700 border-pink-400',
    'Documentation Hub': 'bg-teal-500/20 text-teal-700 border-teal-400',
    'Suggestions': 'bg-cyan-500/20 text-cyan-700 border-cyan-400',
};


const LOGS_PER_PAGE = 15;

export default function LogsPage() {
    const [logs, setLogs] = React.useState<Log[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();
    
    // Filtering state
    const [emailFilter, setEmailFilter] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState<LogCategory | 'all'>('all');
    const [dateFilter, setDateFilter] = React.useState<{ from?: Date; to?: Date }>({});
    const [singleDateFilter, setSingleDateFilter] = React.useState<Date | undefined>(undefined);

    // Pagination state
    const [lastVisible, setLastVisible] = React.useState<any>(null);
    const [firstVisible, setFirstVisible] = React.useState<any>(null);
    const [currentPage, setCurrentPage] = React.useState(1);
    const isMobile = useIsMobile();
    
    const buildQueryConstraints = React.useCallback(() => {
        const constraints: QueryConstraint[] = [];
        const hasComplexFilter = emailFilter || categoryFilter !== 'all';

        if (emailFilter) {
            constraints.push(where('user.email', '==', emailFilter.trim()));
        }
        if (categoryFilter !== 'all') {
            constraints.push(where('category', '==', categoryFilter));
        }

        if (singleDateFilter) {
            const startOfDay = new Date(singleDateFilter);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(singleDateFilter);
            endOfDay.setHours(23, 59, 59, 999);
            constraints.push(where('timestamp', '>=', Timestamp.fromDate(startOfDay)));
            constraints.push(where('timestamp', '<=', Timestamp.fromDate(endOfDay)));
        } else if (dateFilter.from) {
            constraints.push(where('timestamp', '>=', Timestamp.fromDate(dateFilter.from)));
            const toDate = dateFilter.to ? new Date(dateFilter.to) : new Date(dateFilter.from);
            toDate.setHours(23, 59, 59, 999); // Include the whole day
            constraints.push(where('timestamp', '<=', Timestamp.fromDate(toDate)));
        }
        
        if (!hasComplexFilter) {
            constraints.push(orderBy('timestamp', 'desc'));
        }

        return constraints;
    }, [emailFilter, categoryFilter, dateFilter, singleDateFilter]);
    
    const handleSingleDateSelect = (date: Date | undefined) => {
        setSingleDateFilter(date);
        setDateFilter({}); // Clear range filter if single date is set
    }

    const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
        setDateFilter(range || {});
        setSingleDateFilter(undefined); // Clear single date filter if range is set
    }

    const resetFilters = () => {
        setEmailFilter('');
        setCategoryFilter('all');
        setDateFilter({});
        setSingleDateFilter(undefined);
        setCurrentPage(1);
    }
    
    React.useEffect(() => {
        const constraints = buildQueryConstraints();
        const logsQuery = query(
            collection(db, 'logs'), 
            ...constraints,
            limit(LOGS_PER_PAGE)
        );

        const unsubscribe = onSnapshot(logsQuery, 
            (snapshot) => {
                if (!snapshot.empty) {
                    const logsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Log));
                    setLogs(logsData);
                    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                    setFirstVisible(snapshot.docs[0]);
                } else {
                    setLogs([]);
                    setLastVisible(null);
                    setFirstVisible(null);
                }
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching logs:", error);
                toast({ 
                    variant: 'destructive', 
                    title: 'Failed to load logs',
                    description: "A database index may be required for this filter combination. Please check the browser console for a link to create it.",
                    duration: 10000
                });
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [toast, buildQueryConstraints]);
    
    const fetchPage = (direction: 'next' | 'prev') => {
        setIsLoading(true);
        const constraints = buildQueryConstraints();
        const hasComplexFilter = emailFilter || categoryFilter !== 'all';

        let newQuery;
        if (direction === 'next') {
            newQuery = query(
                collection(db, 'logs'),
                ...constraints,
                startAfter(lastVisible),
                limit(LOGS_PER_PAGE)
            );
             setCurrentPage(prev => prev + 1);
        } else { // prev
            newQuery = query(
                collection(db, 'logs'),
                ...constraints,
                endBefore(firstVisible),
                limitToLast(LOGS_PER_PAGE)
            );
            setCurrentPage(prev => Math.max(1, prev - 1));
        }

        const unsubscribe = onSnapshot(newQuery, (snapshot) => {
            if (!snapshot.empty) {
                const logsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Log));
                setLogs(logsData);
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                setFirstVisible(snapshot.docs[0]);
            } else {
                if (direction === 'prev') {
                    setCurrentPage(1);
                }
            }
            setIsLoading(false);
            unsubscribe();
        }, (error) => {
             console.error("Error fetching page:", error);
             toast({ variant: 'destructive', title: 'Error', description: "Failed to load the next page of logs." });
             setIsLoading(false);
        });
    };

    const handleExportCSV = () => {
        if (logs.length === 0) {
            toast({ variant: 'destructive', title: 'No data to export' });
            return;
        }

        const headers = ['Timestamp', 'Category', 'User', 'Message'];
        const rows = logs.map(log => [
            log.timestamp ? format((log.timestamp as Timestamp).toDate(), 'PPpp') : 'N/A',
            log.category,
            log.user?.email || 'System',
            `"${log.message.replace(/"/g, '""')}"` // Escape double quotes
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `vyomsetu_logs_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: 'Export Successful', description: 'Log data has been downloaded as CSV.' });
    };

    
    return (
        <div className="w-full h-full flex flex-col space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b gap-4">
                <div>
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Database/> Activity Logs</h1>
                <p className="text-muted-foreground">An audit trail of all significant actions across the application.</p>
                </div>
                 <Button onClick={handleExportCSV} disabled={logs.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export to CSV
                </Button>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Search/> Filter Logs</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <Input 
                        placeholder="Filter by user email..."
                        value={emailFilter}
                        onChange={(e) => setEmailFilter(e.target.value)}
                    />
                    <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as any)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by category..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {Object.keys(categoryIcons).map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date-range-picker-trigger"
                            variant={"outline"}
                            className={cn(
                                "justify-start text-left font-normal",
                                !dateFilter.from && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFilter.from ? 
                                (dateFilter.to ? `${format(dateFilter.from, "LLL dd, y")} - ${format(dateFilter.to, "LLL dd, y")}` : format(dateFilter.from, "LLL dd, y"))
                                : <span>Filter by date range...</span>
                            }
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                selected={dateFilter}
                                onSelect={handleDateRangeSelect as any}
                                numberOfMonths={2}
                                footer={
                                    <p className="text-center text-sm text-muted-foreground p-2 pt-0">
                                      {!dateFilter.from ? "Select a start date." : !dateFilter.to ? "Select an end date." : " "}
                                    </p>
                                  }
                            />
                        </PopoverContent>
                    </Popover>
                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !singleDateFilter && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {singleDateFilter ? format(singleDateFilter, "PPP") : <span>Filter by date...</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={singleDateFilter}
                                    onSelect={handleSingleDateSelect}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon" onClick={resetFilters} aria-label="Reset Filters">
                            <XCircle className="h-5 w-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                 {isLoading ? (
                     <div className="flex h-full w-full items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                 ) : logs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No activity logs found matching your criteria.</p>
                    </div>
                ) : isMobile ? (
                    <div className="space-y-4">
                        {logs.map((log) => (
                             <Card key={log.id}>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className={`${categoryColors[log.category]} flex items-center gap-2`}>
                                            {categoryIcons[log.category]}
                                            {log.category}
                                        </Badge>
                                        <p className="text-right text-muted-foreground text-xs">
                                          {log.timestamp ? format((log.timestamp as Timestamp).toDate(), 'PPpp') : 'N/A'}
                                        </p>
                                    </div>
                                    <p className="font-medium">{log.message}</p>
                                    <p className="text-sm text-muted-foreground">
                                        User: {log.user?.name || log.user?.email || 'System'}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className='w-[180px]'>Category</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead className='hidden lg:table-cell'>User</TableHead>
                                <TableHead className='text-right'>Timestamp</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                         <Badge variant="outline" className={`${categoryColors[log.category]} flex items-center gap-2`}>
                                            {categoryIcons[log.category]}
                                            {log.category}
                                         </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{log.message}</TableCell>
                                    <TableCell className="text-muted-foreground hidden lg:table-cell">{log.user?.name || log.user?.email || 'System'}</TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs">
                                       {log.timestamp ? format((log.timestamp as Timestamp).toDate(), 'PPpp') : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
                 )}
            </div>
             <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">Page {currentPage}</span>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchPage('prev')}
                        disabled={currentPage === 1 || isLoading}
                    >
                        <ChevronsLeft className="mr-2 h-4 w-4"/>
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchPage('next')}
                        disabled={logs.length < LOGS_PER_PAGE || isLoading}
                    >
                        Next
                        <ChevronsRight className="ml-2 h-4 w-4"/>
                    </Button>
                </div>
            </div>
        </div>
    )
}
