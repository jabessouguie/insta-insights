"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Users, MessageSquare, Zap, Lock } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInstagramData } from "@/hooks/useInstagramData";
import type { AudiencePersona, BrandVoiceAudit, AudienceSegmentsResponse } from "@/types/instagram";
import { useT } from "@/lib/i18n";
import { loadPersonas, savePersonas } from "@/lib/personas-store";
import { ModelSelector } from "@/components/creator/ModelSelector";
import { getModelPref, saveModelPref, DEFAULT_MODEL } from "@/lib/model-prefs-store";

// ─── Big Five axis labels ──────────────────────────────────────────────────────

const AXIS_KEYS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const;

type BigFiveKey = (typeof AXIS_KEYS)[number];

const PERSONA_COLORS = [
  "from-violet-500/20 to-violet-500/5 border-violet-500/30",
  "from-blue-500/20 to-blue-500/5 border-blue-500/30",
  "from-amber-500/20 to-amber-500/5 border-amber-500/30",
  "from-pink-500/20 to-pink-500/5 border-pink-500/30",
];

const RADAR_COLORS = ["#8b5cf6", "#3b82f6", "#f59e0b", "#ec4899"];

// ─── Persona Card ──────────────────────────────────────────────────────────────

function PersonaCard({
  persona,
  index,
  t,
}: {
  persona: AudiencePersona;
  index: number;
  t: ReturnType<typeof useT>;
}) {
  const radarData = AXIS_KEYS.map((key: BigFiveKey) => ({
    subject: t(`audience.bigfive.${key}` as Parameters<typeof t>[0]),
    value: persona.bigFive[key],
  }));

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${PERSONA_COLORS[index]} space-y-4 p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{persona.emoji}</span>
          <div>
            <h3 className="text-sm font-semibold leading-tight">{persona.name}</h3>
            <span className="text-xs text-muted-foreground">
              {persona.sharePercent}% {t("audience.persona.share")}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{persona.description}</p>

      {/* Radar chart */}
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            />
            <Radar
              dataKey="value"
              stroke={RADAR_COLORS[index]}
              fill={RADAR_COLORS[index]}
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Motivations */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("audience.persona.motivations")}
        </p>
        <div className="flex flex-wrap gap-1">
          {persona.motivations.map((m) => (
            <Badge key={m} className="border-0 bg-white/10 text-[10px] text-foreground/80">
              {m}
            </Badge>
          ))}
        </div>
      </div>

      {/* Content pillars */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("audience.persona.pillars")}
        </p>
        <div className="flex flex-wrap gap-1">
          {persona.contentPillars.map((p) => (
            <Badge key={p} className="border-0 bg-primary/20 text-[10px] text-primary">
              {p}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Brand Voice Card ──────────────────────────────────────────────────────────

function BrandVoiceCard({ audit, t }: { audit: BrandVoiceAudit; t: ReturnType<typeof useT> }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{t("audience.voice.title")}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("audience.voice.consistency"), value: `${audit.consistencyScore}/100` },
          { label: t("audience.voice.tone"), value: audit.dominantTone },
          {
            label: t("audience.voice.avgLength"),
            value:
              audit.avgCaptionLength < 50
                ? "Courte"
                : audit.avgCaptionLength < 150
                  ? "Moyenne"
                  : "Longue",
          },
          { label: t("audience.voice.ctaRate"), value: `${audit.ctaUsageRate}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="mt-0.5 truncate text-xs font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("audience.voice.suggestions")}
        </p>
        <ul className="space-y-1.5">
          {audit.suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Zap className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AudiencePage() {
  const t = useT();
  const { data } = useInstagramData();

  const [personas, setPersonas] = useState<AudiencePersona[] | null>(null);
  const [brandVoice, setBrandVoice] = useState<BrandVoiceAudit | null>(null);
  const [commentCount, setCommentCount] = useState(0);
  const [dataSource, setDataSource] = useState<AudienceSegmentsResponse["dataSource"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [aiModel, setAiModel] = useState(DEFAULT_MODEL);
  useEffect(() => {
    setAiModel(getModelPref("audience"));
  }, []);

  // Load persisted personas on mount
  useEffect(() => {
    const saved = loadPersonas();
    if (saved) {
      setPersonas(saved.personas);
      setBrandVoice(saved.brandVoice ?? null);
      setSavedAt(saved.savedAt);
    }
  }, []);

  const [isApiConnected, setIsApiConnected] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsApiConnected(!!localStorage.getItem("ig_access_token"));
  }, []);

  async function handleGenerate() {
    if (!data) return;
    setLoading(true);
    setError(null);

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("ig_access_token");
      const accountId = localStorage.getItem("ig_account_id");
      if (token && accountId) {
        (headers as Record<string, string>)["X-Instagram-Token"] = token;
        (headers as Record<string, string>)["X-Instagram-Account-Id"] = accountId;
      }
    }

    const captions = data.posts
      .filter((p) => p.caption.trim().length > 0)
      .slice(0, 20)
      .map((p) => p.caption);

    try {
      const res = await fetch("/api/audience/segments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          profile: data.profile,
          metrics: data.metrics,
          audienceInsights: data.audienceInsights,
          captions,
          model: aiModel,
        }),
      });
      const json: AudienceSegmentsResponse = await res.json();
      if (json.success && json.personas) {
        setPersonas(json.personas);
        setBrandVoice(json.brandVoice ?? null);
        setCommentCount(json.commentCount ?? 0);
        setDataSource(json.dataSource);
        savePersonas(json.personas, json.brandVoice);
        setSavedAt(new Date().toISOString());
      } else {
        setError(json.error ?? "Erreur lors de l'analyse");
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Users className="h-5 w-5 text-primary" />
              {t("audience.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("audience.subtitle")}</p>
          </div>

          <div className="flex items-center gap-3">
            {dataSource && (
              <Badge
                className={`border-0 text-xs ${
                  dataSource === "graph_api"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {dataSource === "graph_api"
                  ? t("audience.persona.based_on_comments").replace("{n}", String(commentCount))
                  : t("audience.persona.based_on_inference")}
              </Badge>
            )}
            {savedAt && (
              <span className="text-xs text-muted-foreground">
                {t("audience.persona.savedAt")}{" "}
                {new Date(savedAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <ModelSelector
              feature="audience"
              value={aiModel}
              onChange={(m) => {
                setAiModel(m);
                saveModelPref("audience", m);
              }}
              className="w-48 text-left"
            />
            <Button
              onClick={handleGenerate}
              disabled={loading || !data}
              size="sm"
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("audience.persona.generating")}
                </>
              ) : personas ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("audience.persona.generate")}
                </>
              ) : (
                t("audience.persona.generate")
              )}
            </Button>
          </div>
        </div>

        {/* API connection notice */}
        {mounted && !isApiConnected && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              {t("audience.connect.cta")}{" "}
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
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Personas grid */}
        {personas && (
          <div className="grid gap-4 sm:grid-cols-2">
            {personas.map((p, i) => (
              <PersonaCard key={i} persona={p} index={i} t={t} />
            ))}
          </div>
        )}

        {/* Brand voice audit */}
        {brandVoice && <BrandVoiceCard audit={brandVoice} t={t} />}

        {/* Empty state */}
        {!personas && !loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
            <Users className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {t("audience.persona.generate")} pour découvrir tes personas d&apos;audience.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
