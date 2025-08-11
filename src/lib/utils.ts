import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { User } from "./types";

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
  };
  
  const role = user.role;
  const domain = user.domain;

  let suffix = roleAbbr[role];
  let group: User[] = [];

  if (domain && (role === 'domain-lead' || role === 'member')) {
    suffix = `${domainAbbr[domain]}${suffix}`;
    group = allUsers.filter(u => u.role === role && u.domain === domain);
  } else {
    group = allUsers.filter(u => u.role === role);
  }
  
  const userIndex = group.findIndex(u => u.id === user.id);
  const finalIndex = userIndex !== -1 ? userIndex + 1 : 1;

  return `${user.name}-${suffix}-${finalIndex}`;
}
