"use client";

const KEY = "dm_dismissed_v1";

export function getDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function dismissUser(username: string): void {
  if (typeof window === "undefined") return;
  const existing = getDismissed();
  if (!existing.includes(username)) {
    localStorage.setItem(KEY, JSON.stringify([...existing, username]));
  }
}

export function undismissUser(username: string): void {
  if (typeof window === "undefined") return;
  const existing = getDismissed();
  localStorage.setItem(KEY, JSON.stringify(existing.filter((u) => u !== username)));
}
