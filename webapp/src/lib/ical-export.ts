/**
 * iCalendar (ICS) export utility.
 * Generates an RFC 5545 compliant .ics file from ScheduledItems
 * and triggers a browser download — no server needed.
 */

import type { ScheduledItem } from "@/types/instagram";

const TYPE_LABELS: Record<string, string> = {
  post: "Post Instagram",
  carousel: "Carousel Instagram",
  story: "Story Instagram",
  reel: "Reel Instagram",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a JS Date as ICS UTC timestamp: 20260302T100000Z */
function toIcsDate(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`
  );
}

/** Escape special characters per RFC 5545 §3.3.11 */
function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold long lines to 75 octets per RFC 5545 §3.1 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  chunks.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

export function generateIcs(items: ScheduledItem[]): string {
  const now = toIcsDate(new Date());

  const events = items
    .filter((i) => i.scheduledAt)
    .map((item) => {
      const start = new Date(item.scheduledAt);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

      const typeLabel = TYPE_LABELS[item.type] ?? "Contenu Instagram";
      const caption = item.caption ?? "";
      const hashtags = item.hashtags?.join(" ") ?? "";

      const descParts = [
        `Type : ${typeLabel}`,
        caption ? `Caption : ${caption.substring(0, 300)}` : "",
        hashtags ? `Hashtags : ${hashtags}` : "",
        `Statut : ${item.status}`,
      ].filter(Boolean);

      const summary = escapeIcs(`[${typeLabel}]${caption ? " — " + caption.substring(0, 60) : ""}`);
      const description = escapeIcs(descParts.join("\n"));
      const status = item.status === "scheduled" ? "CONFIRMED" : "TENTATIVE";

      return [
        "BEGIN:VEVENT",
        foldLine(`UID:${item.id}@instainsights.app`),
        `DTSTAMP:${now}`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
        foldLine(`SUMMARY:${summary}`),
        foldLine(`DESCRIPTION:${description}`),
        `STATUS:${status}`,
        "END:VEVENT",
      ].join("\r\n");
    });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InstaInsights//Editorial Calendar//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:InstaInsights — Calendrier éditorial",
    "X-WR-TIMEZONE:Europe/Paris",
    ...events,
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

export function downloadIcs(items: ScheduledItem[], filename = "instainsights-calendar.ics"): void {
  const content = generateIcs(items);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
