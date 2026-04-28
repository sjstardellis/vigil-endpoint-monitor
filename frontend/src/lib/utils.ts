import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// The classic shadcn helper. Merges Tailwind class lists and resolves conflicts
// (e.g. "p-2 p-4" → "p-4") so variants compose without surprises.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
