
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a unique ID with a prefix
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}${randomStr}`;
}

// Format currency
export function formatCurrency(amount: number): string {
  return `Rs ${amount.toFixed(2)}`;
}

// Format date
export function formatDate(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Calculate days between two dates
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  
  return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime()) / oneDay));
}

// Generate order number
export function generateOrderNumber(prefix: string, count: number): string {
  const year = new Date().getFullYear();
  const paddedCount = count.toString().padStart(4, '0');
  return `${prefix}-${year}${paddedCount}`;
}
