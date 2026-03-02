/**
 * Calendar Store
 * LocalStorage-backed CRUD for ScheduledItem[].
 * Uses a custom window event to keep multiple components in sync.
 */

import type { ScheduledItem } from "@/types/instagram";

const STORAGE_KEY = "instainsights-calendar";
export const CALENDAR_UPDATED_EVENT = "instainsights-calendar-update";

function load(): ScheduledItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScheduledItem[]) : [];
  } catch {
    return [];
  }
}

function persist(items: ScheduledItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CALENDAR_UPDATED_EVENT));
}

export function getItems(): ScheduledItem[] {
  return load();
}

export function saveItem(item: ScheduledItem): void {
  const items = load();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.push(item);
  }
  persist(items);
}

export function updateItem(id: string, patch: Partial<ScheduledItem>): void {
  const items = load();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return;
  items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
  persist(items);
}

export function deleteItem(id: string): void {
  const items = load().filter((i) => i.id !== id);
  persist(items);
}

export function generateId(): string {
  return `cal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
