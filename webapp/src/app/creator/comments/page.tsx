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

// ─── Types ────────────────────────────────────────────────────────────────────

type Tone = "enthusiastic" | "casual" | "thoughtful" | "inspiring";

const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: "enthusiastic", label: "Enthousiaste", emoji: "🔥" },
  { value: "casual", label: "Naturel", emoji: "😊" },
  { value: "thoughtful", label: "Sincère", emoji: "💭" },
  { value: "inspiring", label: "Inspirant", emoji: "✨" },
];

// ─── Comment card ─────────────────────────────────────────────────────────────

function CommentCard({ text, index }: { text: string; index: number }) {
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
          Option {index + 1}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          className="h-7 gap-1.5 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copié !" : "Copier"}
        </Button>
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommentsPage() {
  const { data, isLoading: dataLoading } = useInstagramData();
  const { lang } = useLanguage();

  const [postUrl, setPostUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [tone, setTone] = useState<Tone>("casual");
  const [comments, setComments] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!caption.trim()) {
      setError("Saisis au moins la caption ou le contexte du post.");
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
        setError(json.error ?? "Erreur lors de la génération.");
      } else {
        setComments(json.comments);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
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
            Générateur de commentaires
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Donne-moi la caption d&apos;un post et je génère des commentaires qui correspondent à ta
            personnalité.
          </p>
        </div>

        {/* Input card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Le post à commenter</CardTitle>
            <CardDescription>
              La caption est obligatoire. L&apos;URL est optionnelle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Post URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                URL du post (optionnel)
              </label>
              <input
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Caption */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Caption / Contexte du post *
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Colle ici la caption du post que tu veux commenter..."
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Tone selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ton du commentaire
              </label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      tone === t.value
                        ? "border-violet-500 bg-violet-500/10 text-violet-400"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language indicator */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Langue des commentaires :{" "}
                <span className="font-medium text-foreground">
                  {lang === "fr" ? "Français" : "English"}
                </span>{" "}
                <span className="text-muted-foreground/60">
                  (modifiable dans la barre de navigation)
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
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Générer 3 commentaires
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
              Commentaires générés
            </p>
            {comments.map((c, i) => (
              <CommentCard key={i} text={c} index={i} />
            ))}

            {/* Regenerate */}
            <Button variant="outline" size="sm" onClick={generate} className="w-full">
              <RefreshCw className="h-3.5 w-3.5" />
              Regénérer
            </Button>
          </div>
        )}

        {/* Personality note */}
        {!dataLoading && data && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Les commentaires sont générés en tenant compte de ta bio et de tes publications récentes
            pour correspondre à ta personnalité.
          </p>
        )}
      </div>
    </div>
  );
}
