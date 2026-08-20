import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function dayKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Consecutive days with at least one study session, counting back from today
 * (or yesterday, so a streak survives until the end of the following day).
 */
export function calculateStreak(dates: (Date | string)[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates.map(dayKey));

  const cursor = startOfDay(new Date());
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function calculateLongestStreak(dates: (Date | string)[]): number {
  if (dates.length === 0) return 0;
  const unique = Array.from(new Set(dates.map((d) => startOfDay(new Date(d)).getTime()))).sort(
    (a, b) => a - b
  );

  let longest = 1;
  let current = 1;
  const oneDay = 24 * 60 * 60 * 1000;

  for (let i = 1; i < unique.length; i += 1) {
    const gap = unique[i] - unique[i - 1];
    current = gap <= oneDay * 1.5 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

export function percent(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatCurrency(amount: number): string {
  return amount === 0 ? "Free" : `$${amount.toFixed(2)}`;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export function lightenDarkenColor(col: string, amt: number) {
  let usePound = false;
  if (col[0] === "#") {
    col = col.slice(1);
    usePound = true;
  }
  const num = parseInt(col, 16);
  let r = (num >> 16) + amt;
  if (r > 255) r = 255;
  else if (r < 0) r = 0;
  let b = ((num >> 8) & 0x00ff) + amt;
  if (b > 255) b = 255;
  else if (b < 0) b = 0;
  let g = (num & 0x0000ff) + amt;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;
  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, "0");
}
