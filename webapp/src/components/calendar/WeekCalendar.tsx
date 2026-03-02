"use client";

import { useMemo, useState } from "react";
import type { OptimalSlot, ScheduledItem, ContentType } from "@/types/instagram";
import { updateItem, saveItem, generateId } from "@/lib/calendar-store";
import { useT } from "@/lib/i18n";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7h → 23h
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// JS day index of each column: Mon=1, Tue=2, ..., Sun=0
const COL_TO_DAY = [1, 2, 3, 4, 5, 6, 0];

const TYPE_PILL: Record<ContentType, string> = {
  post: "bg-blue-500 text-white",
  carousel: "bg-violet-500 text-white",
  story: "bg-pink-500 text-white",
  reel: "bg-amber-500 text-black",
};

const TYPE_ICON: Record<ContentType, string> = {
  post: "📸",
  carousel: "🖼",
  story: "⏱",
  reel: "🎬",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);

  function toast(text: string, duration = 3000) {
    setMsg(text);
    setTimeout(() => setMsg(null), duration);
  }

  return { msg, toast };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeekCalendarProps {
  items: ScheduledItem[];
  slots: OptimalSlot[];
  selectedId: string | null;
  weekStart: Date;
  onSelectItem: (id: string | null) => void;
  onWeekChange: (start: Date) => void;
  onItemsChanged: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeekCalendar({
  items,
  slots,
  selectedId,
  weekStart,
  onSelectItem,
  onWeekChange: _onWeekChange,
  onItemsChanged,
}: WeekCalendarProps) {
  const t = useT();
  const { msg: toastMsg, toast } = useToast();
  const [dragId, setDragId] = useState<string | null>(null);
  const [storyChain, setStoryChain] = useState<{
    show: boolean;
    baseDate: Date;
  } | null>(null);

  // Build slot lookup: "dayIndex-hour" → quality
  const slotMap = useMemo(() => {
    const m = new Map<string, "top" | "good">();
    slots.forEach((s) => {
      m.set(`${s.dayIndex}-${s.hour}`, s.isTopSlot ? "top" : "good");
    });
    return m;
  }, [slots]);

  // Build item lookup: "dayIndex-hour" → ScheduledItem[]
  const itemMap = useMemo(() => {
    const m = new Map<string, ScheduledItem[]>();
    items.forEach((item) => {
      const d = new Date(item.scheduledAt);
      // Check if this item is in the current week
      const itemMonday = mondayOf(d);
      if (itemMonday.getTime() !== weekStart.getTime()) return;
      const key = `${d.getDay()}-${d.getHours()}`;
      const list = m.get(key) ?? [];
      list.push(item);
      m.set(key, list);
    });
    return m;
  }, [items, weekStart]);

  function handleDrop(e: React.DragEvent, colIndex: number, hour: number) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    const dayIndex = COL_TO_DAY[colIndex];
    const key = `${dayIndex}-${hour}`;

    // Collision check
    const occupants = itemMap.get(key) ?? [];
    const others = occupants.filter((i) => i.id !== id);
    if (others.length > 0) {
      toast(t("calendar.collision"));
      return;
    }

    // Compute new scheduledAt
    const colDate = addDays(weekStart, colIndex);
    colDate.setHours(hour, 0, 0, 0);

    updateItem(id, { scheduledAt: colDate.toISOString(), status: "scheduled" });
    onItemsChanged();

    // Story chain suggestion
    const droppedItem = items.find((i) => i.id === id);
    if (droppedItem?.type === "story") {
      const plus2 = addDays(weekStart, colIndex);
      plus2.setHours(hour + 2, 0, 0, 0);
      const plus4 = addDays(weekStart, colIndex);
      plus4.setHours(hour + 4, 0, 0, 0);

      const hasMinus2 = itemMap.has(`${plus2.getDay()}-${plus2.getHours()}`);
      const hasMinus4 = itemMap.has(`${plus4.getDay()}-${plus4.getHours()}`);
      if (!hasMinus2 && !hasMinus4 && hour + 4 <= 23) {
        setStoryChain({ show: true, baseDate: colDate });
      }
    }

    setDragId(null);
  }

  function confirmStoryChain() {
    if (!storyChain) return;
    const base = new Date(storyChain.baseDate);
    const now = new Date().toISOString();
    [2, 4].forEach((offset) => {
      const d = new Date(base);
      d.setHours(d.getHours() + offset);
      const item: ScheduledItem = {
        id: generateId(),
        type: "story",
        status: "draft",
        scheduledAt: d.toISOString(),
        caption: "",
        hashtags: [],
        assets: [],
        igInstructions: {},
        createdAt: now,
        updatedAt: now,
      };
      saveItem(item);
    });
    onItemsChanged();
    setStoryChain(null);
  }

  const lang =
    typeof window !== "undefined" ? (localStorage.getItem("instainsights-lang") ?? "fr") : "fr";
  const dayLabels = lang === "fr" ? DAYS_FR : DAYS_EN;

  // Column dates for header
  const colDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="relative flex-1 overflow-auto">
      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* Story chain suggestion */}
      {storyChain?.show && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-xl border border-pink-500/40 bg-card p-4 shadow-xl">
          <p className="mb-3 text-sm">{t("calendar.story.chain")}</p>
          <div className="flex gap-2">
            <button
              onClick={confirmStoryChain}
              className="flex-1 rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-pink-600"
            >
              {t("calendar.schedule.confirm")}
            </button>
            <button
              onClick={() => setStoryChain(null)}
              className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >
              {t("calendar.schedule.skip")}
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="sticky top-0 z-20 grid grid-cols-[3rem_repeat(7,1fr)] border-b border-border bg-card">
          <div className="py-2" />
          {colDates.map((d, colIdx) => {
            const isToday =
              d.getDate() === today.getDate() &&
              d.getMonth() === today.getMonth() &&
              d.getFullYear() === today.getFullYear();
            return (
              <div
                key={colIdx}
                className={`py-2 text-center text-xs font-medium ${
                  isToday ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="block">{dayLabels[colIdx]}</span>
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${
                    isToday ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hour rows */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[3rem_repeat(7,1fr)] border-b border-border/40"
            style={{ minHeight: "3.5rem" }}
          >
            {/* Hour label */}
            <div className="flex items-start justify-end pr-2 pt-1 text-[10px] text-muted-foreground/60">
              {hour}h
            </div>

            {/* Day cells */}
            {colDates.map((_, colIdx) => {
              const dayIndex = COL_TO_DAY[colIdx];
              const quality = slotMap.get(`${dayIndex}-${hour}`);
              const cellItems = itemMap.get(`${dayIndex}-${hour}`) ?? [];

              let cellClass = "relative min-h-14 border-l border-border/40 p-0.5 transition-colors";
              if (quality === "top")
                cellClass += " bg-green-500/10 ring-inset ring-1 ring-green-500/30";
              else if (quality === "good")
                cellClass += " bg-amber-400/8 ring-inset ring-1 ring-amber-400/20";

              return (
                <div
                  key={colIdx}
                  className={cellClass}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, colIdx, hour)}
                >
                  {cellItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", item.id);
                        setDragId(item.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => onSelectItem(selectedId === item.id ? null : item.id)}
                      className={`mb-0.5 cursor-grab select-none rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight transition-opacity ${
                        TYPE_PILL[item.type]
                      } ${dragId === item.id ? "opacity-40" : ""} ${
                        selectedId === item.id ? "ring-2 ring-white/50" : ""
                      }`}
                    >
                      {TYPE_ICON[item.type]}{" "}
                      {item.caption
                        ? item.caption.slice(0, 22) + (item.caption.length > 22 ? "…" : "")
                        : item.type}
                    </div>
                  ))}

                  {/* Optimal slot badge (empty cell) */}
                  {cellItems.length === 0 && quality && (
                    <div
                      className={`absolute inset-0 flex items-center justify-center text-[9px] font-medium ${
                        quality === "top" ? "text-green-500/50" : "text-amber-400/40"
                      }`}
                    >
                      {quality === "top" ? "★" : "·"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
