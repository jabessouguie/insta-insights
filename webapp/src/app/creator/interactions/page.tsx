"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  UserX,
  MessageSquare,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Users,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AIFeedbackBar } from "@/components/ui/ai-feedback-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useInstagramData } from "@/hooks/useInstagramData";
import type { InteractionAnalysis, UnfollowCandidate, DMSuggestion } from "@/types/instagram";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handle}>
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function CandidateRow({ candidate, tag }: { candidate: UnfollowCandidate; tag?: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 py-3 text-sm last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">@{candidate.username}</p>
        <p className="text-xs text-muted-foreground">
          Suivi depuis le{" "}
          {candidate.followedSince && new Date(candidate.followedSince).getTime() > 0
            ? new Date(candidate.followedSince).toLocaleDateString("fr-FR")
            : "date inconnue"}
          {candidate.lastDmSentAt && (
            <> · DM envoyé le {new Date(candidate.lastDmSentAt).toLocaleDateString("fr-FR")}</>
          )}
        </p>
      </div>
      {tag && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {tag}
        </Badge>
      )}
      <CopyButton text={`@${candidate.username}`} />
      <a
        href={candidate.profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function DMCard({
  suggestion,
  creatorUsername,
  creatorFollowers,
}: {
  suggestion: DMSuggestion;
  creatorUsername: string;
  creatorFollowers: number;
}) {
  const [dm, setDm] = useState(suggestion.suggestedDm || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(
    async (feedback?: string) => {
      setIsGenerating(true);
      setDm("");
      try {
        const res = await fetch("/api/interactions/dm-suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: suggestion.username,
            profileUrl: suggestion.profileUrl,
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
          setDm(text);
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [suggestion, creatorUsername, creatorFollowers]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(dm);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">@{suggestion.username}</CardTitle>
            <CardDescription className="mt-0.5 text-xs">{suggestion.reason}</CardDescription>
          </div>
          <a
            href={suggestion.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {dm ? (
          <div className="relative rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
            <p className="pr-8">
              {dm}
              {isGenerating && (
                <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current align-middle" />
              )}
            </p>
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
        ) : (
          <p className="text-xs italic text-muted-foreground">
            {isGenerating
              ? "Rédaction du DM en cours…"
              : "Clique sur \u201cGénérer\u201d pour obtenir un DM personnalisé via Gemini."}
          </p>
        )}
        {dm && !isGenerating && (
          <AIFeedbackBar
            onRegenerate={generate}
            isGenerating={isGenerating}
            placeholder="Ex: rends le ton plus chaleureux, mentionne leur contenu vidéo…"
          />
        )}
        {!dm && (
          <Button
            size="sm"
            variant="outline"
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
                Générer le DM
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InteractionsPage() {
  const { data: instagramData } = useInstagramData();
  const { data, isLoading } = useSWR<{ success: boolean; data: InteractionAnalysis }>(
    "/api/interactions",
    fetcher,
    { revalidateOnFocus: false }
  );

  const analysis = data?.data;

  return (
    <div className="min-h-screen bg-background">
      <Header profile={instagramData?.profile} mode="creator" />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-6 w-6 text-violet-400" />
            Analyse des Interactions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Identifie les comptes inactifs, les contacts à relancer et ceux à unfollow.
          </p>
        </div>

        {/* Summary badges */}
        {!isLoading && analysis && (
          <div className="mb-6 flex flex-wrap gap-3">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
              <UserX className="h-3.5 w-3.5 text-amber-400" />
              {analysis.neverInteracted.length} jamais interagi
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
              <MessageSquare className="h-3.5 w-3.5 text-violet-400" />
              {analysis.dmSuggestions.length} à contacter
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
              {analysis.unfollowCandidates.length} à unfollow
            </Badge>
          </div>
        )}

        <Tabs defaultValue="inactive" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="inactive">Inactifs</TabsTrigger>
            <TabsTrigger value="dm">DM suggérés</TabsTrigger>
            <TabsTrigger value="unfollow">À unfollow</TabsTrigger>
          </TabsList>

          {/* ── Inactive Tab ── */}
          <TabsContent value="inactive">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <UserX className="h-4 w-4 text-amber-400" />
                  Abonnés que tu suis, jamais interagi
                </CardTitle>
                <CardDescription>
                  Ces comptes te suivent et tu les suis, mais ils n&apos;ont jamais liké ni commenté
                  tes posts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-7 w-16 rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : analysis?.neverInteracted.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    🎉 Tous tes contacts ont interagi avec ton contenu !
                  </p>
                ) : (
                  <div>
                    {analysis?.neverInteracted.map((c) => (
                      <CandidateRow key={c.username} candidate={c} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DM Suggestions Tab ── */}
          <TabsContent value="dm">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <MessageSquare className="h-4 w-4 text-violet-400" />
                    Comptes à relancer
                  </CardTitle>
                  <CardDescription>
                    Tu les suis mais ils ne te suivent pas en retour. Gemini génère un DM
                    personnalisé pour chaque compte.
                  </CardDescription>
                </CardHeader>
              </Card>
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
                  ))}
                </div>
              ) : analysis?.dmSuggestions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aucun compte à contacter pour l&apos;instant.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {analysis?.dmSuggestions.map((s) => (
                    <DMCard
                      key={s.username}
                      suggestion={s}
                      creatorUsername={instagramData?.profile.username ?? ""}
                      creatorFollowers={instagramData?.profile.followerCount ?? 0}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Unfollow Tab ── */}
          <TabsContent value="unfollow">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Trash2 className="h-4 w-4 text-red-400" />
                  Comptes à unfollow
                </CardTitle>
                <CardDescription>
                  Tu les suis, ils ne te suivent pas, et tu leur as envoyé un DM il y a plus
                  d&apos;un mois sans réponse.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))}
                  </div>
                ) : analysis?.unfollowCandidates.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Aucun compte à unfollow pour l&apos;instant.
                  </p>
                ) : (
                  <div>
                    {analysis?.unfollowCandidates.map((c) => (
                      <CandidateRow key={c.username} candidate={c} tag="À unfollow" />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
