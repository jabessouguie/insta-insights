"use client";

import { useState } from "react";
import { Video, Loader2, AlertTriangle, TrendingDown, Zap, Lock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInstagramData } from "@/hooks/useInstagramData";
import type { InstagramPost, SkipRateInsights } from "@/types/instagram";
import { useT } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function skipRisk(avgWatchTime: number | undefined, med: number): "low" | "medium" | "high" | null {
  if (!avgWatchTime || med === 0) return null;
  if (avgWatchTime < med * 0.6) return "high";
  if (avgWatchTime < med * 0.9) return "medium";
  return "low";
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({
  risk,
  t,
}: {
  risk: "low" | "medium" | "high" | null;
  t: ReturnType<typeof useT>;
}) {
  if (!risk) return <span className="text-xs text-muted-foreground">—</span>;
  const styles = {
    low: "bg-green-500/20 text-green-400",
    medium: "bg-amber-500/20 text-amber-400",
    high: "bg-red-500/20 text-red-400",
  };
  return (
    <Badge className={`border-0 text-xs ${styles[risk]}`}>
      {t(`skiprate.risk.${risk}` as Parameters<typeof t>[0])}
    </Badge>
  );
}

// ─── Reels Table ──────────────────────────────────────────────────────────────

function ReelsTable({
  reels,
  med,
  t,
}: {
  reels: InstagramPost[];
  med: number;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("skiprate.col.caption")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("skiprate.col.reach")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("skiprate.col.views")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("skiprate.col.watchtime")}
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("skiprate.col.skiprisk")}
            </th>
          </tr>
        </thead>
        <tbody>
          {reels.map((r) => (
            <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
              <td className="max-w-xs px-4 py-3">
                <p className="truncate text-xs text-muted-foreground">
                  {r.caption.substring(0, 80) || "—"}
                </p>
              </td>
              <td className="px-4 py-3 text-right text-xs tabular-nums">
                {r.reach.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right text-xs tabular-nums">
                {r.videoViews != null ? r.videoViews.toLocaleString() : "—"}
              </td>
              <td className="px-4 py-3 text-right text-xs tabular-nums">
                {r.avgWatchTime != null ? `${r.avgWatchTime.toFixed(1)}s` : "—"}
              </td>
              <td className="px-4 py-3 text-center">
                <RiskBadge risk={skipRisk(r.avgWatchTime, med)} t={t} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Insights Panel ───────────────────────────────────────────────────────────

function InsightsPanel({
  insights,
  t,
}: {
  insights: SkipRateInsights;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{t("skiprate.insight.title")}</h2>
        <Badge className="ml-auto border-0 bg-muted/50 text-xs text-muted-foreground">
          médiane {insights.medianWatchTime.toFixed(1)}s
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Patterns */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-red-300">
            {t("skiprate.insight.patterns")}
          </p>
          <ul className="space-y-1.5">
            {insights.patterns.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {t("skiprate.insight.reco")}
          </p>
          <ul className="space-y-1.5">
            {insights.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReelsPage() {
  const t = useT();
  const { data } = useInstagramData();

  const [insights, setInsights] = useState<SkipRateInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isApiConnected = typeof window !== "undefined" && !!localStorage.getItem("ig_access_token");

  const reels = (data?.posts ?? [])
    .filter((p) => p.mediaType === "REEL")
    .sort((a, b) => {
      // Sort: high-risk first (lowest avgWatchTime), then nulls at end
      const aWt = a.avgWatchTime ?? Infinity;
      const bWt = b.avgWatchTime ?? Infinity;
      return aWt - bWt;
    });

  const med = median(reels.filter((r) => r.avgWatchTime != null).map((r) => r.avgWatchTime!));

  async function handleAnalyze() {
    if (!data || reels.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reels/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reels: reels.slice(0, 50), profile: data.profile }),
      });
      const json: { success: boolean; insights?: SkipRateInsights; error?: string } =
        await res.json();
      if (json.success && json.insights) {
        setInsights(json.insights);
      } else {
        setError(json.error ?? "Erreur");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header mode="creator" />

      <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8">
        {/* Title */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Video className="h-5 w-5 text-primary" />
              {t("skiprate.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("skiprate.subtitle")}</p>
          </div>

          {reels.length > 0 && (
            <Button
              size="sm"
              onClick={handleAnalyze}
              disabled={loading || !data}
              className="shrink-0 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("skiprate.analyzing")}
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  {t("skiprate.analyze")}
                </>
              )}
            </Button>
          )}
        </div>

        {/* No API banner */}
        {!isApiConnected && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              {t("skiprate.no_api")}{" "}
              <a
                href="/creator/connect"
                className="font-medium underline underline-offset-2 hover:text-amber-200"
              >
                {t("nav.connect")} →
              </a>
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* AI Insights */}
        {insights && <InsightsPanel insights={insights} t={t} />}

        {/* Reels Table */}
        {reels.length > 0 ? (
          <ReelsTable reels={reels} med={med} t={t} />
        ) : data ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
            <Video className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t("skiprate.no_reels")}</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
