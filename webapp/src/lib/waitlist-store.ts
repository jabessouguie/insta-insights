/**
 * Waitlist Store
 *
 * Stores waitlist signups locally in localStorage (no backend required yet).
 * The /api/waitlist/join route handles server-side deduplication and is
 * Resend-ready: add RESEND_API_KEY to .env.local to enable email confirmation.
 */

const KEY = "instainsights_waitlist";

export interface WaitlistEntry {
  email: string;
  plan: "pro" | "agency";
  joinedAt: string;
}

function load(): WaitlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WaitlistEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: WaitlistEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function getWaitlistEntries(): WaitlistEntry[] {
  return load();
}

export function isOnWaitlist(email: string): boolean {
  return load().some((e) => e.email.toLowerCase() === email.toLowerCase());
}

export function addToWaitlist(email: string, plan: WaitlistEntry["plan"]): WaitlistEntry {
  const entries = load();
  const existing = entries.find((e) => e.email.toLowerCase() === email.toLowerCase());
  if (existing) return existing;
  const entry: WaitlistEntry = { email, plan, joinedAt: new Date().toISOString() };
  save([...entries, entry]);
  return entry;
}

export function removeFromWaitlist(email: string): void {
  save(load().filter((e) => e.email.toLowerCase() !== email.toLowerCase()));
}

export function clearWaitlist(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
