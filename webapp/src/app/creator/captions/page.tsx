"use client";

import { useState, useEffect } from "react";
import { Sparkles, Copy, Check, FlaskConical, History } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInstagramData } from "@/hooks/useInstagramData";
import { useT } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AbTestResponse } from "@/app/api/captions/ab-test/route";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AbTestEntry {
  id: string;
  idea: string;
  variantA: string;
  variantB: string;
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
  text,
  winner,
  onPick,
  onCopy,
  copied,
}: {
  label: string;
  text: string;
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
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{text}</p>
      <div className="flex gap-2">
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

  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<AbTestEntry | null>(null);
  const [history, setHistory] = useState<AbTestEntry[]>([]);
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);

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
        body: JSON.stringify({ idea: idea.trim(), language: lang }),
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

  function copy(text: string, which: "A" | "B") {
    void navigator.clipboard.writeText(text);
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
          <Button onClick={generate} disabled={loading || !idea.trim()} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {loading ? t("captions.generating") : t("captions.generate")}
          </Button>
        </div>

        {/* Current test */}
        {current && (
          <div className="grid gap-4 sm:grid-cols-2">
            <VariantCard
              label={t("captions.variantA")}
              text={current.variantA}
              winner={current.winner}
              onPick={() => pickWinner(current.id, "A")}
              onCopy={() => copy(current.variantA, "A")}
              copied={copiedA}
            />
            <VariantCard
              label={t("captions.variantB")}
              text={current.variantB}
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
