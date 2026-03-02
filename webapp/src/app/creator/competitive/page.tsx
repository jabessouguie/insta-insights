"use client";

import { useState } from "react";
import { TrendingUp, Loader2, CheckCircle2, AlertTriangle, Lightbulb, Layers } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInstagramData } from "@/hooks/useInstagramData";
import type { CompetitiveAnalysis, CompetitiveAnalysisResponse } from "@/types/instagram";
import { useT } from "@/lib/i18n";

// ─── Niche chips ──────────────────────────────────────────────────────────────

const NICHES = [
  "Beauty",
  "Fitness",
  "Food",
  "Travel",
  "Tech",
  "Finance",
  "Gaming",
  "Education",
  "Lifestyle",
  "Sport",
  "Art",
  "Music",
  "Business",
];

// ─── Result card ──────────────────────────────────────────────────────────────

function AnalysisCard({
  analysis,
  t,
}: {
  analysis: CompetitiveAnalysis;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="space-y-4">
      {/* Positioning */}
      <div className="rounded-xl bg-muted/40 px-4 py-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("competitive.section.position")}
        </p>
        <p className="text-sm leading-relaxed">{analysis.positioning}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Strengths */}
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            <p className="text-xs font-semibold text-green-300">
              {t("competitive.section.strengths")}
            </p>
          </div>
          <ul className="space-y-1.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-400" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Gaps */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-xs font-semibold text-amber-300">{t("competitive.section.gaps")}</p>
          </div>
          <ul className="space-y-2">
            {analysis.gaps.map((g, i) => (
              <li key={i} className="space-y-0.5 text-xs">
                <p className="font-medium text-foreground/80">{g.category}</p>
                <p className="text-muted-foreground">{g.description}</p>
                <p className="text-primary/80">→ {g.opportunity}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Formats to explore */}
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-semibold text-primary">{t("competitive.section.formats")}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {analysis.contentFormats.map((f) => (
            <Badge key={f} className="border-0 bg-primary/15 text-xs text-primary">
              {f}
            </Badge>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-semibold text-primary">{t("competitive.section.reco")}</p>
        </div>
        <ul className="space-y-1.5">
          {analysis.recommendations.map((r, i) => (
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
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompetitivePage() {
  const t = useT();
  const { data } = useInstagramData();

  const [niche, setNiche] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [analysis, setAnalysis] = useState<CompetitiveAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!data || !niche.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const competitorList = competitors
        .split(",")
        .map((c) => c.trim().replace(/^@/, ""))
        .filter(Boolean)
        .slice(0, 3);

      const res = await fetch("/api/competitive/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: data.profile,
          metrics: data.metrics,
          posts: data.posts.slice(0, 30),
          niche: niche.trim(),
          competitors: competitorList.length > 0 ? competitorList : undefined,
        }),
      });
      const json: CompetitiveAnalysisResponse = await res.json();
      if (json.success && json.analysis) {
        setAnalysis(json.analysis);
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

      <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8">
        {/* Title */}
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("competitive.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("competitive.subtitle")}</p>
        </div>

        {/* Input form */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {/* Niche */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t("competitive.niche.label")}
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder={t("competitive.niche.placeholder")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {/* Quick chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {NICHES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNiche(n)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    niche === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Competitors */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t("competitive.competitors.label")}
            </label>
            <input
              type="text"
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder={t("competitive.competitors.placeholder")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={!niche.trim() || loading || !data}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("competitive.analyzing")}
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                {t("competitive.analyze")}
              </>
            )}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Results */}
        {analysis && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold">
                {t("competitive.title")} — {niche}
              </h3>
              <span className="text-xs text-muted-foreground">
                {new Date(analysis.generatedAt).toLocaleDateString("fr-FR")}
              </span>
            </div>
            <AnalysisCard analysis={analysis} t={t} />
          </div>
        )}

        {/* Empty state */}
        {!analysis && !loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <TrendingUp className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t("competitive.subtitle")}</p>
          </div>
        )}
      </main>
    </div>
  );
}
