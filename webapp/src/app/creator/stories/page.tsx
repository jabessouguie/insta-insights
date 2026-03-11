"use client";

import { useMemo } from "react";
import { BookOpen, TrendingUp, Clock, Calendar } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useInstagramData } from "@/hooks/useInstagramData";
import { useT } from "@/lib/i18n";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statCard(label: string, value: string | number) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StoryAnalyticsPage() {
  const { data } = useInstagramData();
  const t = useT();

  const stories = useMemo(() => (data?.posts ?? []).filter((p) => p.mediaType === "STORY"), [data]);

  const byDay = useMemo(() => {
    const counts = Array<number>(7).fill(0);
    for (const s of stories) {
      const d = new Date(s.timestamp);
      counts[d.getDay()]++;
    }
    return DAY_KEYS.map((key, i) => ({ name: key, count: counts[i] }));
  }, [stories]);

  const byHour = useMemo(() => {
    const counts = Array<number>(24).fill(0);
    for (const s of stories) {
      const h = new Date(s.timestamp).getHours();
      counts[h]++;
    }
    return Array.from({ length: 24 }, (_, i) => ({
      name: `${String(i).padStart(2, "0")}h`,
      count: counts[i],
    }));
  }, [stories]);

  const bestDay = useMemo(() => {
    if (stories.length === 0) return "—";
    const max = byDay.reduce((a, b) => (b.count > a.count ? b : a));
    return max.count > 0 ? max.name : "—";
  }, [byDay, stories.length]);

  const bestHour = useMemo(() => {
    if (stories.length === 0) return "—";
    const max = byHour.reduce((a, b) => (b.count > a.count ? b : a));
    return max.count > 0 ? max.name : "—";
  }, [byHour, stories.length]);

  // Stories per week (using oldest → newest span)
  const perWeek = useMemo(() => {
    if (stories.length < 2) return stories.length;
    const sorted = [...stories].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const ms =
      new Date(sorted[sorted.length - 1].timestamp).getTime() -
      new Date(sorted[0].timestamp).getTime();
    const weeks = ms / (7 * 24 * 60 * 60 * 1000) || 1;
    return Math.round(stories.length / weeks);
  }, [stories]);

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-6">
        {/* Page header */}
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">{t("storyanalytics.title")}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("storyanalytics.subtitle")}</p>
        </div>

        {stories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
            {t("storyanalytics.noData")}
          </p>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {statCard(t("storyanalytics.total"), stories.length)}
              {statCard(t("storyanalytics.perWeek"), perWeek)}
              {statCard(t("storyanalytics.bestDay"), bestDay)}
              {statCard(t("storyanalytics.bestHour"), bestHour)}
            </div>

            {/* By day */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">{t("storyanalytics.byDay")}</h2>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byDay} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* By hour */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">{t("storyanalytics.byHour")}</h2>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byHour} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      interval={1}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Activity list — recent 10 stories */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">{t("storyanalytics.activity")}</h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                        Likes
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                        Comments
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                        Reach
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...stories]
                      .sort(
                        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                      )
                      .slice(0, 10)
                      .map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-border/30 last:border-0 hover:bg-muted/10"
                        >
                          <td className="px-4 py-2 text-muted-foreground">
                            {new Date(s.timestamp).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-right">{s.likes}</td>
                          <td className="px-4 py-2 text-right">{s.comments}</td>
                          <td className="px-4 py-2 text-right">{s.reach}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
