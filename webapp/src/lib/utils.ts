import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with locale-aware abbreviation (1.2K, 3.4M) */
export function formatNumber(n: number, decimals = 1): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`;
  return n.toLocaleString("fr-FR");
}

/** Format a percentage with a + sign for positive values */
export function formatPercent(n: number, decimals = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}%`;
}

/** Format a date relative to now */
export function timeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

/** Format a date as dd/MM/yyyy */
export function formatDate(date: Date): string {
  return format(date, "dd/MM/yyyy", { locale: fr });
}

/** Format a date as MMMM yyyy (e.g. "Janvier 2024") */
export function formatMonth(date: Date): string {
  return format(date, "MMMM yyyy", { locale: fr });
}

/** Compute engagement rate: (likes + comments) / followers * 100 */
export function computeEngagementRate(
  totalLikes: number,
  totalComments: number,
  postCount: number,
  followerCount: number
): number {
  if (postCount === 0 || followerCount === 0) return 0;
  const avgInteractions = (totalLikes + totalComments) / postCount;
  return (avgInteractions / followerCount) * 100;
}

/** Score from 0-100 based on engagement rate benchmarks */
export function engagementRateScore(rate: number): number {
  if (rate >= 6) return 100;
  if (rate >= 3) return 80;
  if (rate >= 1) return 60;
  if (rate >= 0.5) return 40;
  return 20;
}

/** Returns a color class based on score 0-100 */
export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

/** Returns a badge variant based on score */
export function scoreBadgeVariant(
  score: number
): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  if (score >= 40) return "outline";
  return "destructive";
}

/** Converts hour (0-23) to readable string */
export function hourToLabel(hour: number): string {
  if (hour === 0) return "00h";
  if (hour < 10) return `0${hour}h`;
  return `${hour}h`;
}

/** Returns day of week name in French */
export const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Truncate a string with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/** Generate a random ID */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
