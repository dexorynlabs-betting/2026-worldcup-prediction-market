import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPct(n: number, digits = 2): string {
  return (n * 100).toFixed(digits) + '%';
}

export function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}
