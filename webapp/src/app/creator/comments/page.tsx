"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, RefreshCw, MessageSquarePlus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useInstagramData } from "@/hooks/useInstagramData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tone = "enthusiastic" | "casual" | "thoughtful" | "inspiring";

// ─── Comment card ─────────────────────────────────────────────────────────────

function CommentCard({ text, index }: { text: string; index: number }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-violet-500/40">
      <div className="mb-2 flex items-center justify-between">
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          {t("comments.card.option")} {index + 1}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          className="h-7 gap-1.5 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? t("comments.card.copied") : t("comments.card.copy")}
        </Button>
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommentsPage() {
  const t = useT();
  const { data, isLoading: dataLoading } = useInstagramData();
  const { lang } = useLanguage();

  const tones: { value: Tone; label: string; emoji: string }[] = [
    { value: "enthusiastic", label: t("comments.tone.enthusiastic"), emoji: "🔥" },
    { value: "casual", label: t("comments.tone.casual"), emoji: "😊" },
    { value: "thoughtful", label: t("comments.tone.thoughtful"), emoji: "💭" },
    { value: "inspiring", label: t("comments.tone.inspiring"), emoji: "✨" },
  ];

  const [postUrl, setPostUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [tone, setTone] = useState<Tone>("casual");
  const [comments, setComments] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!caption.trim()) {
      setError(t("comments.error.captionRequired"));
      return;
    }
    setError("");
    setIsGenerating(true);
    setComments([]);

    try {
      const recentCaptions = (data?.posts ?? [])
        .filter((p) => p.caption)
        .slice(0, 5)
        .map((p) => p.caption);

      const res = await fetch("/api/comments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          postUrl: postUrl || undefined,
          tone,
          language: lang,
          userBio: data?.profile.bio,
          recentCaptions,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? t("comments.error.generationFailed"));
      } else {
        setComments(json.comments);
      }
    } catch {
      setError(t("comments.error.networkError"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        {/* Title */}
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquarePlus className="h-6 w-6 text-violet-400" />
            {t("comments.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("comments.subtitle")}</p>
        </div>

        {/* Input card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{t("comments.form.title")}</CardTitle>
            <CardDescription>{t("comments.form.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Post URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("comments.form.urlLabel")}
              </label>
              <input
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder={t("comments.form.urlPlaceholder")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Caption */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("comments.form.captionLabel")}
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t("comments.form.captionPlaceholder")}
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Tone selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("comments.form.toneLabel")}
              </label>
              <div className="flex flex-wrap gap-2">
                {tones.map((toneOption) => (
                  <button
                    key={toneOption.value}
                    onClick={() => setTone(toneOption.value)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      tone === toneOption.value
                        ? "border-violet-500 bg-violet-500/10 text-violet-400"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {toneOption.emoji} {toneOption.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language indicator */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t("comments.form.languageLabel")}{" "}
                <span className="font-medium text-foreground">
                  {lang === "fr" ? t("comments.form.language.fr") : t("comments.form.language.en")}
                </span>{" "}
                <span className="text-muted-foreground/60">
                  {t("comments.form.languageHelper")}
                </span>
              </p>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <Button
              onClick={generate}
              disabled={isGenerating || !caption.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("comments.button.generating")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t("comments.button.generate")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {isGenerating && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isGenerating && comments.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("comments.results.label")}
            </p>
            {comments.map((c, i) => (
              <CommentCard key={i} text={c} index={i} />
            ))}

            {/* Regenerate */}
            <Button variant="outline" size="sm" onClick={generate} className="w-full">
              <RefreshCw className="h-3.5 w-3.5" />
              {t("comments.button.regenerate")}
            </Button>
          </div>
        )}

        {/* Personality note */}
        {!dataLoading && data && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("comments.note.personality")}
          </p>
        )}
      </div>
    </div>
  );
}
