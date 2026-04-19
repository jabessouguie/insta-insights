"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, Film, Images, BookOpen } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import { ModelSelector } from "@/components/creator/ModelSelector";
import { getModelPref, saveModelPref } from "@/lib/model-prefs-store";
import type { UGCScript, UGCFormat } from "@/types/instagram";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FORMAT_ICONS: Record<UGCFormat, React.ReactNode> = {
  carousel: <Images className="h-4 w-4" />,
  reels: <Film className="h-4 w-4" />,
  stories: <BookOpen className="h-4 w-4" />,
};

const FORMAT_COLORS: Record<UGCFormat, string> = {
  carousel: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  reels: "bg-pink-500/10 text-pink-400 border-pink-500/30",
  stories: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function UGCPage() {
  const t = useT();
  const { lang } = useLanguage();

  const [brandName, setBrandName] = useState("");
  const [constraints, setConstraints] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<UGCScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [aiModel, setAiModel] = useState<string>(getModelPref("ugc"));

  const handleGenerate = async () => {
    if (!brandName.trim()) {
      setError(t("ugc.error.brand"));
      return;
    }
    setError(null);
    setIsGenerating(true);
    setResult(null);

    try {
      const res = await fetch("/api/ugc/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          constraints: constraints.trim() || undefined,
          language: lang,
          model: aiModel,
        }),
      });
      const data = (await res.json()) as { success: boolean; ugc?: UGCScript; error?: string };
      if (!data.success || !data.ugc) throw new Error(data.error ?? "Unknown error");
      setResult(data.ugc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPost = (index: number, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAll = () => {
    if (!result) return;
    const allText = result.posts
      .map(
        (p) =>
          `=== ${p.title} ===\n${p.script}\n${t("ugc.post.visual")}: ${p.visualDescription}${p.cta ? `\n${t("ugc.post.cta")}: ${p.cta}` : ""}`
      )
      .join("\n\n");
    void navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header mode="creator" />
      <main className="container mx-auto max-w-3xl space-y-8 px-4 py-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("ugc.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("ugc.subtitle")}</p>
        </div>

        {/* Form */}
        <div className="space-y-5 rounded-xl border bg-card p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("ugc.brand.label")}</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={t("ugc.brand.placeholder")}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && !isGenerating && void handleGenerate()}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("ugc.constraints.label")}</label>
            <textarea
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder={t("ugc.constraints.placeholder")}
              rows={3}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <ModelSelector
            feature="ugc"
            value={aiModel}
            onChange={(m) => {
              setAiModel(m);
              saveModelPref("ugc", m);
            }}
            className="mb-2"
          />

          <Button
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
            className="w-full gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? t("ugc.button.generating") : t("ugc.button.generate")}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Format badge + reason */}
            <div className="space-y-3 rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("ugc.format.label")}
                </span>
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1.5 px-3 py-1 ${FORMAT_COLORS[result.format]}`}
                >
                  {FORMAT_ICONS[result.format]}
                  {t(`ugc.format.${result.format}` as Parameters<typeof t>[0])}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("ugc.format.reason")} : </span>
                {result.formatReason}
              </p>
            </div>

            {/* Copy all */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={copyAll} className="gap-2">
                {copiedAll ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copiedAll ? t("ugc.copied") : t("ugc.copy.all")}
              </Button>
            </div>

            {/* Post cards */}
            <div className="space-y-4">
              {result.posts.map((post) => (
                <div key={post.index} className="space-y-3 rounded-xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {post.index}. {post.title}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyPost(post.index, post.script)}
                      className="h-8 gap-1.5 text-xs"
                    >
                      {copiedIndex === post.index ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedIndex === post.index ? t("ugc.copied") : t("ugc.copy.post")}
                    </Button>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.script}</p>

                  <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{t("ugc.post.visual")} :</span>{" "}
                      {post.visualDescription}
                    </p>
                    {post.cta && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">{t("ugc.post.cta")} :</span> {post.cta}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
