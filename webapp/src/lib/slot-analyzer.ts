/**
 * Slot Analyser
 * Computes optimal posting slots from Instagram analytics metrics.
 */

import type { InstagramMetrics, OptimalSlot, ScheduledItem } from "@/types/instagram";

// French day names → JS dayIndex (0=Sun)
const FR_DAY_INDEX: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  // English fallbacks
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function normalise(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map((v) => v / max);
}

/**
 * Build a ranked list of (dayIndex × hour) posting slots from parser metrics.
 * Returns the top 25 slots sorted by combined score, with the top 3 flagged isTopSlot.
 */
export function computeOptimalSlots(metrics: InstagramMetrics): OptimalSlot[] {
  const days = metrics.bestPostingDays ?? [];
  const hours = metrics.bestPostingHours ?? [];

  if (days.length === 0 || hours.length === 0) return [];

  // Normalise
  const dayScores = normalise(days.map((d) => d.avgEngagement));
  const hourScores = normalise(hours.map((h) => h.avgEngagement));

  // Take top 5 days × top 5 hours (25 cross-products)
  const topDays = days.slice(0, 5);
  const topHours = hours.slice(0, 5);

  const slots: OptimalSlot[] = [];

  topDays.forEach((day, di) => {
    const dayIndex = FR_DAY_INDEX[day.day.toLowerCase()] ?? -1;
    if (dayIndex === -1) return;

    topHours.forEach((hour, hi) => {
      const score = (dayScores[di] ?? 0) * (hourScores[hi] ?? 0);
      slots.push({ dayIndex, hour: hour.hour, score, isTopSlot: false });
    });
  });

  // Sort desc, deduplicate (same dayIndex+hour)
  const seen = new Set<string>();
  const unique: OptimalSlot[] = [];
  for (const s of slots.sort((a, b) => b.score - a.score)) {
    const key = `${s.dayIndex}-${s.hour}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }

  // Mark top 3
  unique.slice(0, 3).forEach((s) => (s.isTopSlot = true));

  return unique;
}

/**
 * Return the next available Date that falls on a free optimal slot.
 * Walks through slots starting from `afterDate` (default: now), skipping
 * occupied ones. Loops over up to 4 weeks before falling back to `afterDate + 1h`.
 */
export function nextFreeSlot(
  items: ScheduledItem[],
  slots: OptimalSlot[],
  afterDate: Date = new Date()
): Date {
  if (slots.length === 0) {
    const fallback = new Date(afterDate);
    fallback.setMinutes(0, 0, 0);
    fallback.setHours(fallback.getHours() + 1);
    return fallback;
  }

  // Build a set of occupied "YYYY-MM-DD-HH" keys
  const occupied = new Set(
    items
      .filter((i) => i.status !== "published")
      .map((i) => {
        const d = new Date(i.scheduledAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
      })
  );

  // Sort slots by score desc
  const sorted = [...slots].sort((a, b) => b.score - a.score);

  // Try each day in the next 4 weeks
  for (let dayOffset = 0; dayOffset <= 28; dayOffset++) {
    const candidate = new Date(afterDate);
    candidate.setDate(candidate.getDate() + dayOffset);
    candidate.setMinutes(0, 0, 0);

    const weekday = candidate.getDay(); // 0=Sun

    for (const slot of sorted) {
      if (slot.dayIndex !== weekday) continue;

      candidate.setHours(slot.hour);
      // Must be in the future
      if (candidate <= afterDate) continue;

      const key = `${candidate.getFullYear()}-${candidate.getMonth()}-${candidate.getDate()}-${candidate.getHours()}`;
      if (!occupied.has(key)) return new Date(candidate);
    }
  }

  // Absolute fallback
  const fallback = new Date(afterDate);
  fallback.setHours(fallback.getHours() + 1, 0, 0, 0);
  return fallback;
}

/**
 * Given an OptimalSlot list, return whether a given Date is an optimal slot.
 */
export function slotQuality(
  date: Date,
  slots: OptimalSlot[]
): "top" | "good" | "neutral" {
  const dayIndex = date.getDay();
  const hour = date.getHours();
  const match = slots.find((s) => s.dayIndex === dayIndex && s.hour === hour);
  if (!match) return "neutral";
  return match.isTopSlot ? "top" : "good";
}
