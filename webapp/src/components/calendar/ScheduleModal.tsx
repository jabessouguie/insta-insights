"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { nextFreeSlot } from "@/lib/slot-analyzer";
import { getItems } from "@/lib/calendar-store";
import type { OptimalSlot, ScheduledItem, ContentType } from "@/types/instagram";
import { useT } from "@/lib/i18n";

interface ScheduleModalProps {
  draft: Partial<ScheduledItem>;
  slots: OptimalSlot[];
  onSchedule: (item: ScheduledItem) => void;
  onDismiss: () => void;
}

const TYPE_COLORS: Record<ContentType, string> = {
  post: "bg-blue-500/20 text-blue-400",
  carousel: "bg-violet-500/20 text-violet-400",
  story: "bg-pink-500/20 text-pink-400",
  reel: "bg-amber-500/20 text-amber-400",
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ScheduleModal({ draft, slots, onSchedule, onDismiss }: ScheduleModalProps) {
  const t = useT();
  const items = useMemo(() => getItems(), []);
  const suggested = useMemo(() => nextFreeSlot(items, slots), [items, slots]);

  const [selectedDate, setSelectedDate] = useState<string>(toLocalInputValue(suggested));

  useEffect(() => {
    setSelectedDate(toLocalInputValue(suggested));
  }, [suggested]);

  const firstAsset = draft.assets?.[0];
  const isVideo = firstAsset?.startsWith("data:video");

  function handleConfirm() {
    const now = new Date().toISOString();
    const item: ScheduledItem = {
      id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: draft.type ?? "post",
      status: "scheduled",
      scheduledAt: new Date(selectedDate).toISOString(),
      caption: draft.caption ?? "",
      hashtags: draft.hashtags ?? [],
      assets: draft.assets ?? [],
      igInstructions: draft.igInstructions ?? {},
      createdAt: now,
      updatedAt: now,
    };
    onSchedule(item);
  }

  const formattedSuggested = suggested.toLocaleDateString("fr-FR", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t("calendar.schedule.cta")}</span>
          </div>
          <button onClick={onDismiss} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type badge + thumbnail */}
          <div className="flex items-start gap-3">
            <Badge
              className={`${TYPE_COLORS[draft.type ?? "post"]} border-0 capitalize shrink-0`}
            >
              {draft.type ?? "post"}
            </Badge>
            {firstAsset && !isVideo && (
              <img
                src={firstAsset}
                alt="preview"
                className="h-16 w-16 rounded-lg object-cover ring-1 ring-border"
              />
            )}
            {firstAsset && isVideo && (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted ring-1 ring-border text-xs text-muted-foreground">
                🎬 Reel
              </div>
            )}
            {draft.caption && (
              <p className="line-clamp-3 text-xs text-muted-foreground flex-1">
                {draft.caption}
              </p>
            )}
          </div>

          {/* Suggested slot */}
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2">
            <Clock className="h-3.5 w-3.5 text-green-400 shrink-0" />
            <span className="text-xs text-green-300">
              {t("calendar.schedule.next")}{" "}
              <span className="font-medium capitalize">{formattedSuggested}</span>
            </span>
          </div>

          {/* Date/time picker */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t("calendar.schedule.chooseDate")}
            </label>
            <input
              type="datetime-local"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button onClick={handleConfirm} className="flex-1" size="sm">
            {t("calendar.schedule.confirm")}
          </Button>
          <Button variant="outline" onClick={onDismiss} size="sm" className="flex-1">
            {t("calendar.schedule.skip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
