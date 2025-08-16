/**
 * @fileoverview Tree Navigation Component (Legacy).
 * @description This frontend (FE) file was the tree navigation component for the "Library" feature.
 * It has since been refactored and renamed to support the `Documentation` feature.
 *
 * This file is now considered legacy and may be removed in a future cleanup.
 * Its responsibilities were moved to `src/components/dashboard/documentation/tree-nav.tsx`.
 *
 * NOTE: This file and its corresponding folder (`/library`) have been renamed to `/documentation`
 * to better reflect the feature's purpose. This file might still exist temporarily but is no longer
 * in active use.
 *
 * Tech Used:
 * - React: For UI and state management.
 * - Next.js: For `Link` component and `useSearchParams`.
 * - ShadCN UI: For `Collapsible` and `Button` components.
 * - Lucide-React: For icons.
 */
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Folder, FolderOpen } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn, buildTree } from '@/lib/utils';
import type { DocumentationItem } from '@/lib/types';

interface TreeNavProps {
    items: DocumentationItem[];
}

export default function TreeNav({ items }: TreeNavProps) {
    const searchParams = useSearchParams();
    const currentFolderId = searchParams.get('folderId');

    const tree = React.useMemo(() => buildTree(items), [items]);

    const createQueryString = (name: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(name, value);
        return params.toString();
    };

    const renderTree = (nodes: DocumentationItem[], level = 0) => {
        return nodes.map(node => {
            if (node.type === 'file') {
                return null;
            }

            const children = (node as any).children;
            const hasChildren = children && children.filter((c: any) => c.type === 'folder').length > 0;
            const isActive = node.id === currentFolderId;

            return (
                <Collapsible 
                    key={node.id} 
                    defaultOpen={true}
                    className="w-full"
                    style={{ paddingLeft: `${level * 1}rem` }}
                >
                    <div className="flex items-center space-x-1">
                        <Link href={`/dashboard/library?${createQueryString('folderId', node.id)}`} className="flex-grow">
                             <Button
                                variant={isActive ? 'secondary' : 'ghost'}
                                size="sm"
                                className="w-full justify-start text-left h-8 px-2"
                             >
                                 {isActive ? <FolderOpen className="mr-2 h-4 w-4" /> : <Folder className="mr-2 h-4 w-4" />}
                                 <span className="truncate">{node.name}</span>
                             </Button>
                        </Link>
                        {hasChildren && (
                             <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform duration-200 [&[data-state=open]>path]:-rotate-90"><path d="m6 9 6 6 6-6"></path></svg>
                                    <span className="sr-only">Toggle</span>
                                </Button>
                            </CollapsibleTrigger>
                        )}
                    </div>
                    {hasChildren && (
                        <CollapsibleContent className="py-1">
                            {renderTree(children, level + 1)}
                        </CollapsibleContent>
                    )}
                </Collapsible>
            );
        });
    };

    return (
        <div className="space-y-1">
            <Link href="/dashboard/library">
                 <Button
                    variant={!currentFolderId ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start text-left h-8 px-2 mb-2"
                 >
                    <Folder className="mr-2 h-4 w-4" />
                    Library Home
                 </Button>
            </Link>
            {renderTree(tree)}
        </div>
    );
}
