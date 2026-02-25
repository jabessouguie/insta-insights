"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  MessageCircle,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIFeedbackBar } from "@/components/ui/ai-feedback-bar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstagramData } from "@/hooks/useInstagramData";
import type { UnansweredDM } from "@/lib/dm-response-composer";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── DM Reply Card ─────────────────────────────────────────────────────────────

function DMReplyCard({
  dm,
  creatorUsername,
  creatorFollowers,
}: {
  dm: UnansweredDM;
  creatorUsername: string;
  creatorFollowers: number;
}) {
  const [reply, setReply] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(
    async (feedback?: string) => {
      setIsGenerating(true);
      setReply("");
      try {
        const res = await fetch("/api/responses/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: dm.username,
            lastMessage: dm.lastMessage,
            creatorProfile: { username: creatorUsername, followerCount: creatorFollowers },
            feedback,
          }),
        });
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setReply(text);
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [dm, creatorUsername, creatorFollowers]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const relativeTime = (date: Date) => {
    const d = new Date(date);
    if (isNaN(d.getTime()) || d.getTime() === 0) return "Date inconnue";
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
    return d.toLocaleDateString("fr-FR");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <span>@{dm.username}</span>
              <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
                {relativeTime(dm.lastMessageAt)}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2 text-xs">
              {dm.lastMessage}
            </CardDescription>
          </div>
          <a
            href={dm.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {reply && (
          <div className="relative rounded-lg bg-muted/50 p-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="min-h-[60px] w-full resize-none bg-transparent pr-8 text-sm leading-relaxed outline-none"
              rows={3}
              readOnly={isGenerating}
            />
            {isGenerating && (
              <span className="pointer-events-none absolute bottom-3 right-3 inline-block h-3.5 w-0.5 animate-pulse bg-foreground/60" />
            )}
            {!isGenerating && (
              <button
                onClick={handleCopy}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        )}

        {!reply && (
          <p className="text-xs italic text-muted-foreground">
            {isGenerating
              ? "Rédaction de la réponse en cours…"
              : "Clique sur \u201cGénérer\u201d pour obtenir une réponse personnalisée via Gemini."}
          </p>
        )}

        {reply && !isGenerating && (
          <AIFeedbackBar
            onRegenerate={generate}
            isGenerating={isGenerating}
            placeholder="Ex: sois plus bref, réponds à leur question spécifique, ton plus amical…"
          />
        )}
        {!reply && (
          <Button
            size="sm"
            variant="default"
            className="w-full text-xs"
            onClick={() => generate()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                Générer une réponse
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ResponsesPage() {
  const { data: instagramData } = useInstagramData();
  const { data, isLoading } = useSWR<{ success: boolean; data: UnansweredDM[] }>(
    "/api/responses",
    fetcher,
    { revalidateOnFocus: false }
  );

  const dms = data?.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header profile={instagramData?.profile} mode="creator" />

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-5 w-5 text-violet-400" />
            Rédaction assistée de DMs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            DMs sans réponse dans ton export Instagram — Gemini génère une réponse que tu valides
            avant d&apos;envoyer.
          </p>
        </div>

        {!isLoading && dms.length > 0 && (
          <div className="mb-6 flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
              <MessageCircle className="h-3.5 w-3.5 text-violet-400" />
              {dms.length} message{dms.length > 1 ? "s" : ""} sans réponse
            </Badge>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : dms.length === 0 ? (
          <Card className="py-16 text-center">
            <CardContent>
              <MessageCircle className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {data?.success === false
                  ? "Données Instagram non disponibles. Assure-toi que ton export est dans data/."
                  : "🎉 Tous tes DMs ont reçu une réponse !"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dms.map((dm) => (
              <DMReplyCard
                key={`${dm.username}-${dm.lastMessageAt}`}
                dm={dm}
                creatorUsername={instagramData?.profile.username ?? ""}
                creatorFollowers={instagramData?.profile.followerCount ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
