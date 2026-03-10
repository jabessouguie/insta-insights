"use client";

/**
 * Growth store — persists daily snapshots of key metrics in localStorage.
 * Each snapshot is keyed to the day it was recorded (ISO date, e.g. "2026-03-10").
 * A maximum of 400 snapshots (~13 months) are retained to bound storage usage.
 */

const STORAGE_KEY = "insta_growth_snapshots";
const MAX_SNAPSHOTS = 400;

/** A single day's metrics snapshot. */
export interface GrowthSnapshot {
  /** ISO date string, e.g. "2026-03-10". */
  date: string;
  followers: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
}

/**
 * Loads all stored growth snapshots, sorted by date ascending.
 *
 * @returns Array of snapshots, oldest first.
 */
export function loadSnapshots(): GrowthSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GrowthSnapshot[];
    return parsed.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

/**
 * Records a new snapshot for today.
 * If a snapshot for today already exists, it is overwritten (idempotent).
 * Trims the list to MAX_SNAPSHOTS, keeping the most recent entries.
 *
 * @param snapshot - Snapshot data (date field is set to today if omitted).
 */
export function recordSnapshot(snapshot: Omit<GrowthSnapshot, "date"> & { date?: string }): void {
  try {
    const today = snapshot.date ?? new Date().toISOString().slice(0, 10);
    const existing = loadSnapshots().filter((s) => s.date !== today);
    const updated: GrowthSnapshot[] = [...existing, { ...snapshot, date: today }]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-MAX_SNAPSHOTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage quota exceeded or unavailable — fail silently
  }
}

/**
 * Returns snapshots for the last N days, including today.
 *
 * @param days - Number of days to include (30, 90, or 365).
 * @returns Filtered and sorted snapshots.
 */
export function getSnapshotsForPeriod(days: number): GrowthSnapshot[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return loadSnapshots().filter((s) => s.date >= cutoffStr);
}

/**
 * Computes the follower delta between the oldest and newest snapshot in a set.
 *
 * @param snapshots - Sorted array of snapshots.
 * @returns Numeric delta (positive = growth, negative = loss), or null if < 2 snapshots.
 */
export function computeFollowerDelta(snapshots: GrowthSnapshot[]): number | null {
  if (snapshots.length < 2) return null;
  return snapshots[snapshots.length - 1]!.followers - snapshots[0]!.followers;
}
