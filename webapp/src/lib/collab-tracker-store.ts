"use client";

/**
 * Collab Tracker Store
 * Persists collaboration follow-up status in localStorage.
 * Tracks whether emails/DMs were sent, replies received, and when relances are needed.
 */

export type CollabStatus =
  | "not_contacted"
  | "not_interested"
  | "email_sent"
  | "dm_sent"
  | "replied_positive"
  | "replied_negative";

export interface CollabTracking {
  collabId: string;
  collabName: string;
  collabEmail?: string;
  collabHandle?: string;
  status: CollabStatus;
  /** ISO date when email/DM was sent */
  sentAt?: string;
  /** ISO date when they replied */
  repliedAt?: string;
  /** ISO date of last follow-up email */
  followUpSentAt?: string;
  notes?: string;
  /** Body of the email that was sent (saved for context in reply suggestions) */
  sentEmailBody?: string;
  /** Prospect's reply text entered by the user */
  prospectReply?: string;
}

const KEY = "insta_collab_trackings";
/** Number of days without reply before suggesting a follow-up */
export const FOLLOWUP_DAYS = 3;

export function loadTrackings(): CollabTracking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CollabTracking[];
  } catch {
    return [];
  }
}

export function getTracking(collabId: string): CollabTracking | undefined {
  return loadTrackings().find((t) => t.collabId === collabId);
}

export function saveTracking(tracking: CollabTracking): void {
  if (typeof window === "undefined") return;
  const all = loadTrackings().filter((t) => t.collabId !== tracking.collabId);
  localStorage.setItem(KEY, JSON.stringify([...all, tracking]));
}

export function updateStatus(
  collabId: string,
  status: CollabStatus,
  extra?: Partial<CollabTracking>
): void {
  const existing = getTracking(collabId);
  if (!existing) return;
  saveTracking({ ...existing, status, ...extra });
}

/** Returns true if the collab needs a follow-up (email sent > FOLLOWUP_DAYS days ago, no reply) */
export function needsFollowUp(tracking: CollabTracking): boolean {
  if (tracking.status !== "email_sent") return false;
  if (!tracking.sentAt) return false;
  const sent = new Date(tracking.sentAt);
  const now = new Date();
  const days = (now.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24);
  return days >= FOLLOWUP_DAYS;
}

/** Returns IDs of collabs that should be excluded from new searches */
export function getExcludedIds(): string[] {
  return loadTrackings()
    .filter((t) => t.status === "not_interested" || t.status === "replied_positive")
    .map((t) => t.collabId);
}

/** Returns names of ALL tracked collabs to exclude from new finder searches */
export function getAllTrackedNames(): string[] {
  return loadTrackings().map((t) => t.collabName);
}

/** Saves the body of the email that was sent to a collab */
export function updateSentEmail(collabId: string, sentEmailBody: string): void {
  const existing = getTracking(collabId);
  if (!existing) return;
  saveTracking({ ...existing, sentEmailBody });
}

/** Saves the prospect's reply text */
export function updateProspectReply(collabId: string, prospectReply: string): void {
  const existing = getTracking(collabId);
  if (!existing) return;
  saveTracking({ ...existing, prospectReply });
}

export const STATUS_LABELS: Record<CollabStatus, string> = {
  not_contacted: "Non contacté",
  not_interested: "Pas intéressé",
  email_sent: "Email envoyé",
  dm_sent: "DM envoyé",
  replied_positive: "Réponse positive",
  replied_negative: "Réponse négative",
};

export const STATUS_COLORS: Record<CollabStatus, string> = {
  not_contacted: "text-muted-foreground border-border bg-muted/30",
  not_interested: "text-red-400 border-red-400/30 bg-red-400/10",
  email_sent: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  dm_sent: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  replied_positive: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  replied_negative: "text-orange-400 border-orange-400/30 bg-orange-400/10",
};
