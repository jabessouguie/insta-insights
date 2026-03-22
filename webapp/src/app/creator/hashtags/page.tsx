"use client";

import { useState, useMemo } from "react";
import type React from "react";
import { Hash, Sparkles, Loader2, Copy, Check, TrendingUp, BarChart2, Info } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInstagramData } from "@/hooks/useInstagramData";
import { analyzeHashtags, hasEngagementData } from "@/lib/hashtag-analyzer";
import type { HashtagStat } from "@/lib/hashtag-analyzer";
import type { HashtagSuggestResponse } from "@/app/api/hashtags/suggest/route";
import { useT } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Hashtag row ──────────────────────────────────────────────────────────────

function HashtagRow({ stat, showEngagement }: { stat: HashtagStat; showEngagement: boolean }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(stat.tag);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-4 py-2.5">
      <span className="flex-1 font-mono text-sm text-primary">{stat.tag}</span>
      <span className="w-16 text-right text-xs text-muted-foreground">{stat.count}×</span>
      {showEngagement && (
        <>
          <span className="w-20 text-right text-xs text-muted-foreground">
            {stat.avgLikes.toLocaleString()}
          </span>
          <span className="w-20 text-right text-xs text-muted-foreground">{stat.avgComments}</span>
          <span className="w-24 text-right text-xs font-medium text-foreground">
            {stat.avgEngagement.toLocaleString()}
          </span>
        </>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy}>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HashtagsPage() {
  const { data, isLoading } = useInstagramData();
  const t = useT();
  const { lang } = useLanguage();

  const [niche, setNiche] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [rationale, setRationale] = useState("");
  const [copiedSuggestion, setCopiedSuggestion] = useState<string | null>(null);

  const stats = useMemo<HashtagStat[]>(() => {
    if (!data?.posts?.length) return [];
    return analyzeHashtags(data.posts);
  }, [data]);

  const engagementAvailable = useMemo(
    () => (data?.posts ? hasEngagementData(data.posts) : false),
    [data]
  );

  // When engagement data is unavailable, top performers = most used (already sorted by count)
  const topPerformers = useMemo(
    () =>
      engagementAvailable
        ? [...stats].sort((a, b) => b.avgEngagement - a.avgEngagement).slice(0, 10)
        : stats.slice(0, 10),
    [stats, engagementAvailable]
  );

  const totalUses = useMemo(() => stats.reduce((sum, s) => sum + s.count, 0), [stats]);
  const avgPerPost = useMemo(() => {
    if (!data?.posts?.length) return 0;
    return Math.round(totalUses / data.posts.length);
  }, [totalUses, data]);

  async function handleSuggest() {
    if (!stats.length) return;
    setSuggesting(true);
    setSuggestions([]);
    setRationale("");
    try {
      const topTags = stats.slice(0, 20).map((s) => s.tag);
      const res = await fetch("/api/hashtags/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topHashtags: topTags, niche, language: lang }),
      });
      const json: HashtagSuggestResponse = await res.json();
      if (json.success && json.data) {
        setSuggestions(json.data.suggestions);
        setRationale(json.data.rationale);
      }
    } finally {
      setSuggesting(false);
    }
  }

  function copySuggestion(tag: string) {
    void navigator.clipboard.writeText(tag);
    setCopiedSuggestion(tag);
    setTimeout(() => setCopiedSuggestion(null), 1500);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6">
        {/* Page header */}
        <div>
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">{t("hashtags.title")}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("hashtags.subtitle")}</p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Chargement...</span>
          </div>
        )}

        {!isLoading && stats.length === 0 && (
          <p className="rounded-xl border border-border/40 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            {t("hashtags.no_data")}
          </p>
        )}

        {stats.length > 0 && (
          <>
            {/* Engagement data unavailable banner */}
            {!engagementAvailable && (
              <div className="flex items-start gap-3 rounded-xl border border-[#ffd953]/20 bg-[#ffd953]/5 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#ffd953]" />
                <p className="text-sm text-[#cfcbba]/80">
                  <span className="font-medium text-[#ffd953]">
                    Métriques d&apos;engagement non disponibles.
                  </span>{" "}
                  L&apos;export HTML Instagram ne contient pas les likes et commentaires par
                  publication. Les hashtags sont triés par fréquence d&apos;utilisation. Connecte
                  l&apos;API Instagram pour débloquer les données d&apos;engagement.
                </p>
              </div>
            )}

            {/* Overview stats */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard label={t("hashtags.stats.total")} value={stats.length} />
              <StatCard label={t("hashtags.stats.uses")} value={totalUses.toLocaleString()} />
              <StatCard label={t("hashtags.stats.avg_per_post")} value={avgPerPost} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Most used */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{t("hashtags.top_used")}</h2>
                  <Badge variant="secondary">{t("hashtags.col.count")}</Badge>
                </div>
                <div className="space-y-2">
                  {/* Column headers */}
                  <div className="flex items-center gap-3 px-4 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span className="flex-1">{t("hashtags.col.tag")}</span>
                    <span className="w-16 text-right">{t("hashtags.col.count")}</span>
                    {engagementAvailable && (
                      <>
                        <span className="w-20 text-right">{t("hashtags.col.avg_likes")}</span>
                        <span className="w-20 text-right">{t("hashtags.col.avg_comments")}</span>
                        <span className="w-24 text-right">{t("hashtags.col.avg_engagement")}</span>
                      </>
                    )}
                    <span className="w-7" />
                  </div>
                  {stats.slice(0, 15).map((stat) => (
                    <HashtagRow key={stat.tag} stat={stat} showEngagement={engagementAvailable} />
                  ))}
                </div>
              </section>

              {/* Top performers by engagement (or most used when no engagement) */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">
                    {engagementAvailable ? t("hashtags.top_performers") : t("hashtags.top_used")}
                  </h2>
                  <Badge variant="secondary">
                    {engagementAvailable
                      ? t("hashtags.col.avg_engagement")
                      : t("hashtags.col.count")}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-4 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span className="flex-1">{t("hashtags.col.tag")}</span>
                    <span className="w-16 text-right">{t("hashtags.col.count")}</span>
                    {engagementAvailable && (
                      <>
                        <span className="w-20 text-right">{t("hashtags.col.avg_likes")}</span>
                        <span className="w-20 text-right">{t("hashtags.col.avg_comments")}</span>
                        <span className="w-24 text-right">{t("hashtags.col.avg_engagement")}</span>
                      </>
                    )}
                    <span className="w-7" />
                  </div>
                  {topPerformers.map((stat) => (
                    <HashtagRow key={stat.tag} stat={stat} showEngagement={engagementAvailable} />
                  ))}
                </div>
              </section>
            </div>

            {/* AI suggestions */}
            <section className="rounded-xl border border-border/50 bg-card p-6">
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {t("hashtags.niche_label")}
                  </label>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNiche(e.target.value)}
                    placeholder={t("hashtags.niche_placeholder")}
                    className="h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <Button
                  onClick={() => void handleSuggest()}
                  disabled={suggesting}
                  className="gap-2"
                >
                  {suggesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {suggesting ? t("hashtags.suggesting") : t("hashtags.suggest")}
                </Button>
              </div>

              {suggestions.length > 0 && (
                <>
                  <h3 className="mb-3 text-sm font-semibold">{t("hashtags.suggestions_title")}</h3>
                  {rationale && <p className="mb-3 text-xs text-muted-foreground">{rationale}</p>}
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => copySuggestion(tag)}
                        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary transition-colors hover:bg-primary/20"
                      >
                        {tag}
                        {copiedSuggestion === tag ? (
                          <Check className="h-3 w-3 text-green-400" />
                        ) : (
                          <Copy className="h-3 w-3 opacity-60" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
