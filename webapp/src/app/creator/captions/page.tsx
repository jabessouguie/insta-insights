"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, Copy, Check, FlaskConical, History, Hash } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInstagramData } from "@/hooks/useInstagramData";
import { analyzeHashtags } from "@/lib/hashtag-analyzer";
import { useT } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AbTestResponse } from "@/app/api/captions/ab-test/route";
import { ModelSelector } from "@/components/creator/ModelSelector";
import { getModelPref, saveModelPref, DEFAULT_MODEL } from "@/lib/model-prefs-store";

interface CaptionVariant {
  hook: string;
  body: string;
}

interface AbTestEntry {
  id: string;
  idea: string;
  variantA: string | CaptionVariant;
  variantB: string | CaptionVariant;
  winner: "A" | "B" | null;
  createdAt: string;
}

const STORAGE_KEY = "instainsights_ab_captions";

function loadHistory(): AbTestEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as AbTestEntry[];
  } catch {
    return [];
  }
}

function saveEntry(entry: AbTestEntry): void {
  if (typeof window === "undefined") return;
  const existing = loadHistory();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...existing].slice(0, 20)));
}

function updateWinner(id: string, winner: "A" | "B"): AbTestEntry[] {
  const entries = loadHistory().map((e) => (e.id === id ? { ...e, winner } : e));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return entries;
}

// ─── Variant card ─────────────────────────────────────────────────────────────

function VariantCard({
  label,
  variant,
  winner,
  onPick,
  onCopy,
  copied,
}: {
  label: string;
  variant: string | CaptionVariant;
  winner: "A" | "B" | null;
  onPick: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const t = useT();
  const isPicked = winner !== null;
  const isWinner = winner === label.slice(-1);

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-5 ${
        isWinner
          ? "border-primary/40 bg-primary/5"
          : isPicked
            ? "border-border/30 bg-muted/10 opacity-60"
            : "border-border/50 bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        {isWinner && (
          <Badge variant="outline" className="border-primary/40 text-xs text-primary">
            ✓ {t("captions.picked")}
          </Badge>
        )}
      </div>
      <div className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {typeof variant === "string" ? (
          <p>{variant}</p>
        ) : (
          <div className="space-y-2">
            <p className="font-bold text-foreground">Hook : {variant.hook}</p>
            <p>Body : {variant.body}</p>
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        {!isPicked && (
          <Button size="sm" onClick={onPick} className="gap-1.5">
            {t("captions.pick")}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onCopy} className="gap-1.5">
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {t("captions.copy")}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CaptionsPage() {
  const { data } = useInstagramData();
  const t = useT();
  const { lang } = useLanguage();

  // Top 10 performing hashtags from the creator's data — passed to the AI
  const topHashtags = useMemo(() => {
    if (!data?.posts?.length) return [];
    const stats = analyzeHashtags(data.posts);
    // Prefer engagement-sorted, fall back to usage-count sorted
    const sorted = stats.some((s) => s.avgEngagement > 0)
      ? [...stats].sort((a, b) => b.avgEngagement - a.avgEngagement)
      : stats;
    return sorted.slice(0, 10).map((s) => s.tag);
  }, [data]);

  const { topReelsCaptions, worstReelsCaptions } = useMemo(() => {
    if (!data?.posts?.length) return { topReelsCaptions: [], worstReelsCaptions: [] };
    const reels = data.posts.filter((p) => p.mediaType === "VIDEO" || p.mediaType === "REEL");
    if (reels.length < 4) return { topReelsCaptions: [], worstReelsCaptions: [] }; // Need enough data

    const sortedByEngagement = [...reels].sort(
      (a, b) => b.likes + b.comments - (a.likes + a.comments)
    );

    // Grab top 3 and worst 3 that actually have captions
    const topCaptions = sortedByEngagement
      .map((p) => p.caption)
      .filter((c) => c && c.length > 20)
      .slice(0, 3);
    const worstCaptions = sortedByEngagement
      .reverse()
      .map((p) => p.caption)
      .filter((c) => c && c.length > 20)
      .slice(0, 3);

    return { topReelsCaptions: topCaptions, worstReelsCaptions: worstCaptions };
  }, [data]);

  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<AbTestEntry | null>(null);
  const [history, setHistory] = useState<AbTestEntry[]>([]);
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);
  const [testVariable, setTestVariable] = useState<"hook" | "body" | "auto">("hook");

  const [aiModel, setAiModel] = useState(DEFAULT_MODEL);
  useEffect(() => {
    setAiModel(getModelPref("captions"));
  }, []);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function generate() {
    if (!idea.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/captions/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          language: lang,
          ...(topHashtags.length > 0 && { topHashtags }),
          ...(topReelsCaptions.length > 0 && { topReelsCaptions }),
          ...(worstReelsCaptions.length > 0 && { worstReelsCaptions }),
          model: aiModel,
          testVariable,
        }),
      });
      const json = (await res.json()) as AbTestResponse;
      if (!json.success || !json.variantA || !json.variantB) return;

      const entry: AbTestEntry = {
        id: crypto.randomUUID(),
        idea: idea.trim(),
        variantA: json.variantA,
        variantB: json.variantB,
        winner: null,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      saveEntry(entry);
      setCurrent(entry);
      setHistory(loadHistory());
      setIdea("");
    } finally {
      setLoading(false);
    }
  }

  function pickWinner(id: string, variant: "A" | "B") {
    const updated = updateWinner(id, variant);
    setHistory(updated);
    if (current?.id === id) setCurrent({ ...current, winner: variant });
  }

  function copy(variant: string | CaptionVariant, which: "A" | "B") {
    const textToCopy = typeof variant === "string" ? variant : `${variant.hook}\n\n${variant.body}`;
    void navigator.clipboard.writeText(textToCopy);
    if (which === "A") {
      setCopiedA(true);
      setTimeout(() => setCopiedA(false), 1500);
    } else {
      setCopiedB(true);
      setTimeout(() => setCopiedB(false), 1500);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">{t("captions.title")}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("captions.subtitle")}</p>
        </div>

        {/* Generator */}
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <label className="mb-2 block text-sm font-medium">{t("captions.idea")}</label>
          <textarea
            className="mb-4 w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            rows={3}
            placeholder={t("captions.ideaPlaceholder")}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={generate} disabled={loading || !idea.trim()} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {loading ? t("captions.generating") : t("captions.generate")}
            </Button>
            {topHashtags.length > 0 && (
              <span className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                {topHashtags.length} hashtags performants injectés
              </span>
            )}
            <div className="ml-auto flex items-center gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Isoler la variable
                </label>
                <select
                  value={testVariable}
                  onChange={(e) => setTestVariable(e.target.value as "hook" | "body" | "auto")}
                  className="w-40 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="hook">Différents Hooks</option>
                  <option value="body">Différentes Descriptions</option>
                  <option value="auto">Auto (les deux)</option>
                </select>
              </div>
              <ModelSelector
                feature="captions"
                value={aiModel}
                onChange={(m) => {
                  setAiModel(m);
                  saveModelPref("captions", m);
                }}
                className="w-40"
              />
            </div>
          </div>
        </div>

        {/* Current test */}
        {current && (
          <div className="grid gap-4 sm:grid-cols-2">
            <VariantCard
              label={t("captions.variantA")}
              variant={current.variantA}
              winner={current.winner}
              onPick={() => pickWinner(current.id, "A")}
              onCopy={() => copy(current.variantA, "A")}
              copied={copiedA}
            />
            <VariantCard
              label={t("captions.variantB")}
              variant={current.variantB}
              winner={current.winner}
              onPick={() => pickWinner(current.id, "B")}
              onCopy={() => copy(current.variantB, "B")}
              copied={copiedB}
            />
          </div>
        )}

        {/* History */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t("captions.history")}</h2>
          </div>
          {history.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/40 p-6 text-center text-sm text-muted-foreground">
              {t("captions.empty")}
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="cursor-pointer rounded-xl border border-border/40 bg-muted/10 p-4 hover:bg-muted/20"
                  onClick={() => setCurrent(entry)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{entry.idea}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      {entry.winner && (
                        <Badge variant="outline" className="text-xs">
                          Winner: {entry.winner}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{entry.createdAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
