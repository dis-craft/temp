/**
 * @fileoverview Textarea Component.
 * @description A standard, reusable Textarea component for multi-line text input, built using
 * Tailwind CSS for styling. This is a frontend (FE) component.
 *
 * It is a simple wrapper around the standard HTML `<textarea>` element, enhanced with styling
 * from the project's design system (via Tailwind and `cn` utility).
 *
 * Linked Files:
 * - This component is used in various forms across the application, such as:
 *   - `src/components/dashboard/create-task-modal.tsx`
 *   - `src/components/dashboard/edit-task-modal.tsx`
 *   - `src/components/dashboard/suggestion-modal.tsx`
 *   - `src/components/dashboard/announcement-modal.tsx`
 *
 * Tech Used:
 * - React: For component creation.
 * - Tailwind CSS / clsx / tailwind-merge: For styling.
 */
import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
