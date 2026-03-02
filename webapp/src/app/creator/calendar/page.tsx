"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { ReadyToPostPanel } from "@/components/calendar/ReadyToPostPanel";
import { ScheduleModal } from "@/components/calendar/ScheduleModal";
import {
  getItems,
  saveItem,
  updateItem,
  deleteItem,
  CALENDAR_UPDATED_EVENT,
} from "@/lib/calendar-store";
import { computeOptimalSlots } from "@/lib/slot-analyzer";
import { useInstagramData } from "@/hooks/useInstagramData";
import type { ScheduledItem, ContentType } from "@/types/instagram";
import { useT } from "@/lib/i18n";

// ─── helpers ──────────────────────────────────────────────────────────────────

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("fr-FR", opts)} – ${end.toLocaleDateString("fr-FR", { ...opts, year: "numeric" })}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const t = useT();
  const { data } = useInstagramData();

  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<{
    open: boolean;
    draft: Partial<ScheduledItem>;
  }>({ open: false, draft: {} });

  // Sync from localStorage + listen for updates
  const refreshItems = useCallback(() => {
    setItems(getItems());
  }, []);

  useEffect(() => {
    refreshItems();
    window.addEventListener(CALENDAR_UPDATED_EVENT, refreshItems);
    return () => window.removeEventListener(CALENDAR_UPDATED_EVENT, refreshItems);
  }, [refreshItems]);

  const slots = useMemo(
    () => (data?.metrics ? computeOptimalSlots(data.metrics) : []),
    [data?.metrics]
  );

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  // Stats
  const scheduled = items.filter((i) => i.status === "scheduled").length;
  const draft = items.filter((i) => i.status === "draft").length;

  function handleSchedule(item: ScheduledItem) {
    saveItem(item);
    refreshItems();
    setShowModal({ open: false, draft: {} });
  }

  function handlePublished(id: string) {
    updateItem(id, { status: "published" });
    refreshItems();
    setSelectedId(null);
  }

  function handleDelete(id: string) {
    deleteItem(id);
    refreshItems();
    setSelectedId(null);
  }

  const TYPE_OPTIONS: { type: ContentType; icon: string; label: string }[] = [
    { type: "post", icon: "📸", label: "Post" },
    { type: "carousel", icon: "🖼", label: "Carousel" },
    { type: "story", icon: "⏱", label: "Story" },
    { type: "reel", icon: "🎬", label: "Reel" },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header mode="creator" />

      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const prev = new Date(weekStart);
                prev.setDate(prev.getDate() - 7);
                setWeekStart(prev);
              }}
              className="rounded-lg p-1.5 hover:bg-muted"
              title={t("calendar.week.prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekStart(mondayOf(new Date()))}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {formatWeekRange(weekStart)}
            </button>
            <button
              onClick={() => {
                const next = new Date(weekStart);
                next.setDate(next.getDate() + 7);
                setWeekStart(next);
              }}
              className="rounded-lg p-1.5 hover:bg-muted"
              title={t("calendar.week.next")}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Stats badges */}
          <div className="hidden items-center gap-2 sm:flex">
            {scheduled > 0 && (
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-400">
                {scheduled} planifié{scheduled > 1 ? "s" : ""}
              </span>
            )}
            {draft > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {draft} brouillon{draft > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Legend + new button */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-[10px] text-muted-foreground sm:flex">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {t("calendar.slot.optimal")}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Bon créneau
            </span>
          </div>
          <div className="flex gap-1">
            {TYPE_OPTIONS.map(({ type, icon, label }) => (
              <button
                key={type}
                onClick={() => setShowModal({ open: true, draft: { type, igInstructions: {} } })}
                className="hidden items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs hover:bg-muted sm:flex"
                title={`Nouveau ${label}`}
              >
                {icon}
              </button>
            ))}
            <button
              onClick={() =>
                setShowModal({ open: true, draft: { type: "post", igInstructions: {} } })
              }
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("calendar.new")}
            </button>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex min-h-0 flex-1">
        <WeekCalendar
          items={items}
          slots={slots}
          selectedId={selectedId}
          weekStart={weekStart}
          onSelectItem={setSelectedId}
          onWeekChange={setWeekStart}
          onItemsChanged={refreshItems}
        />

        {selectedItem && (
          <ReadyToPostPanel
            item={selectedItem}
            onClose={() => setSelectedId(null)}
            onPublished={handlePublished}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Schedule modal */}
      {showModal.open && (
        <ScheduleModal
          draft={showModal.draft}
          slots={slots}
          onSchedule={handleSchedule}
          onDismiss={() => setShowModal({ open: false, draft: {} })}
        />
      )}
    </div>
  );
}
