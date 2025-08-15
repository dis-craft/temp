
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { User, DocumentationItem } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUserName(user: User, allUsers: User[] = []): string {
  if (!user?.name) {
    return 'Anonymous';
  }

  const roleAbbr: Record<User['role'], string> = {
    'super-admin': 'SAdm',
    'admin': 'Adm',
    'domain-lead': 'DL',
    'member': 'Mem',
  };

  const domainAbbr: Record<NonNullable<User['domain']>, string> = {
    'Mechanical': 'Mech',
    'Electrical': 'Elec',
    'Software': 'Sw',
    'Documentation': 'Doc',
  };
  
  const role = user.role;
  const domain = user.domain;

  let suffix = roleAbbr[role];
  let group: User[] = [];

  if (domain && (role === 'domain-lead' || role === 'member')) {
    // Check if domain exists in domainAbbr before using it.
    if (domain in domainAbbr) {
      suffix = `${domainAbbr[domain as keyof typeof domainAbbr]}${suffix}`;
    } else {
      // Fallback for dynamic domains
      suffix = `${domain.substring(0, 3)}${suffix}`;
    }
    group = allUsers.filter(u => u.role === role && u.domain === domain);
  } else {
    group = allUsers.filter(u => u.role === role);
  }
  
  const userIndex = group.findIndex(u => u.id === user.id);
  const finalIndex = userIndex !== -1 ? userIndex + 1 : 1;

  return `${user.name}-${suffix}-${finalIndex}`;
}


export function buildTree(items: DocumentationItem[]): DocumentationItem[] {
  const itemMap: { [key: string]: DocumentationItem & { children?: DocumentationItem[] } } = {};
  const roots: (DocumentationItem & { children?: DocumentationItem[] })[] = [];

  // Initialize map
  items.forEach(item => {
    itemMap[item.id] = { ...item, children: [] };
  });

  // Build the tree
  Object.values(itemMap).forEach(item => {
    if (item.parentId && itemMap[item.parentId]) {
      itemMap[item.parentId].children?.push(item);
    } else {
      roots.push(item);
    }
  });

  // Sort children: folders first, then alphabetically
  const sortChildren = (node: DocumentationItem & { children?: DocumentationItem[] }) => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  };

  roots.forEach(sortChildren);
  
  // Sort roots as well
  roots.sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  return roots;
};

export function findPath(items: DocumentationItem[], itemId: string | null): DocumentationItem[] {
    if (!itemId) return [];

    const itemMap: { [key: string]: DocumentationItem } = {};
    items.forEach(item => {
        itemMap[item.id] = item;
    });

    const path: DocumentationItem[] = [];
    let current = itemMap[itemId];

    while (current) {
        path.unshift(current);
        current = current.parentId ? itemMap[current.parentId] : null;
    }

    return path;
}
