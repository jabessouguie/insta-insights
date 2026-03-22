"use client";

import type { ExecutiveReport } from "@/types/instagram";

const KEY = "insta_executive_reports";
const MAX_REPORTS = 20;

export type ReportPeriodType = "weekly" | "monthly";

export interface SavedReport {
  id: string;
  periodType: ReportPeriodType;
  report: ExecutiveReport;
  savedAt: string; // ISO date
}

export function loadReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedReport[];
  } catch {
    return [];
  }
}

export function saveReport(
  report: ExecutiveReport,
  periodType: ReportPeriodType = "monthly"
): SavedReport {
  const saved: SavedReport = {
    id: crypto.randomUUID(),
    periodType,
    report,
    savedAt: new Date().toISOString(),
  };
  const existing = loadReports();
  const updated = [saved, ...existing].slice(0, MAX_REPORTS);
  localStorage.setItem(KEY, JSON.stringify(updated));
  return saved;
}

export function deleteReport(id: string): void {
  const existing = loadReports();
  localStorage.setItem(KEY, JSON.stringify(existing.filter((r) => r.id !== id)));
}

export function clearReports(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
