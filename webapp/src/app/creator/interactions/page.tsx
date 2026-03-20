"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  UserX,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Users,
  MessageCircle,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useInstagramData, getIgHeaders } from "@/hooks/useInstagramData";
import { useT } from "@/lib/i18n";
import type { InteractionAnalysis, UnfollowCandidate, DMSuggestion } from "@/types/instagram";

const fetcher = (url: string) => fetch(url, { headers: getIgHeaders() }).then((r) => r.json());

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="rounded p-1 text-muted-foreground hover:text-foreground">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// ─── Candidate row (unfollow tab) ─────────────────────────────────────────────

function CandidateRow({ candidate }: { candidate: UnfollowCandidate }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 border-b border-border/40 py-3 text-sm last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">@{candidate.username}</p>
        <p className="text-xs text-muted-foreground">
          {t("interactions.candidate.followedSince")}{" "}
          {candidate.followedSince && new Date(candidate.followedSince).getTime() > 0
            ? new Date(candidate.followedSince).toLocaleDateString("fr-FR")
            : t("interactions.candidate.unknownDate")}
          {candidate.lastDmSentAt && (
            <>
              {" "}
              · {t("interactions.candidate.lastDm")}{" "}
              {new Date(candidate.lastDmSentAt).toLocaleDateString("fr-FR")}
            </>
          )}
        </p>
      </div>
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

// ─── Free DM generator (any bio, not tied to listed accounts) ─────────────────

function FreeDMGenerator() {
  const [bio, setBio] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const generate = async (opts?: { feedback?: string; previousDm?: string }) => {
    if (!bio.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/interactions/dm-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "unknown",
          bio: bio.trim(),
          feedback: opts?.feedback ?? null,
          previousDm: opts?.previousDm ?? null,
        }),
      });
      const json: { success: boolean; message?: string } = await res.json();
      if (json.success && json.message) {
        setMessage(json.message);
        setFeedback("");
        setShowFeedback(false);
      }
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (!feedback.trim() || !message) return;
    generate({ feedback: feedback.trim(), previousDm: message });
  };

  const copyMsg = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <MessageCircle className="h-4 w-4 text-violet-400" />
          Générer un DM à partir d'une bio
        </CardTitle>
        <CardDescription>
          Collez n'importe quelle bio Instagram pour générer un message personnalisé, même hors de
          vos listes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Collez ici la bio Instagram du compte que vous souhaitez contacter…"
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => generate()}
            disabled={generating || !bio.trim()}
            className="gap-1.5 text-xs"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Générer DM
          </Button>
          {message && (
            <>
              <button
                onClick={copyMsg}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => setShowFeedback((v) => !v)}
                title="Affiner le DM"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {message && (
          <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm leading-relaxed text-foreground">
            {message}
          </p>
        )}

        {showFeedback && message && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Ex : plus court, ajoute de l'humour, commence par une question…"
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerate}
              disabled={generating || !feedback.trim()}
              className="gap-1.5 text-xs"
            >
              {generating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Régénérer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── DM card (dm-suggest tabs) ────────────────────────────────────────────────

function DMCard({ suggestion }: { suggestion: DMSuggestion }) {
  const [bio, setBio] = useState<string>(suggestion.bio ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/interactions/dm-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: suggestion.username, bio: bio.trim() || null }),
      });
      const json: { success: boolean; message?: string } = await res.json();
      if (json.success && json.message) setMessage(json.message);
    } catch {
      // network error — silent
    } finally {
      setGenerating(false);
    }
  };

  const copyMsg = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">@{suggestion.username}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{suggestion.reason}</p>
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

      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Bio Instagram (optionnel — coller la bio pour personnaliser le message)"
        rows={2}
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={generate}
          disabled={generating}
          className="gap-1.5 text-xs"
        >
          {generating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Générer DM
        </Button>
        {message && (
          <button
            onClick={copyMsg}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {message && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-foreground">
          {message}
        </p>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InteractionsPage() {
  const t = useT();
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
            {t("interactions.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("interactions.subtitle")}</p>
        </div>

        {/* Summary badges */}
        {!isLoading && analysis && (
          <div className="mb-6 flex flex-wrap gap-3">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
              <UserX className="h-3.5 w-3.5 text-amber-400" />
              {analysis.neverInteracted.length} {t("interactions.badge.neverInteracted")}
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
              <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
              {(analysis.dmSuggestionsNoFollowBack?.length ?? 0) +
                (analysis.dmSuggestionsMutual?.length ?? 0)}{" "}
              DM suggérés
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
              {analysis.unfollowCandidates.length} {t("interactions.badge.toUnfollow")}
            </Badge>
          </div>
        )}

        <FreeDMGenerator />

        <Tabs defaultValue="dm-nofollowback" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="dm-nofollowback" className="text-xs">
              DM · Non-retour
            </TabsTrigger>
            <TabsTrigger value="dm-mutual" className="text-xs">
              DM · Mutuels
            </TabsTrigger>
            <TabsTrigger value="unfollow" className="text-xs">
              À unfollow
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: DM · No follow-back ─────────────────────────────────── */}
          <TabsContent value="dm-nofollowback">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <MessageCircle className="h-4 w-4 text-blue-400" />
                  DM — Ils ne vous suivent pas encore
                </CardTitle>
                <CardDescription>
                  Vous les suivez mais ils ne vous suivent pas en retour. Un message authentique
                  pourrait créer la connexion.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingSkeleton />
                ) : analysis?.dataSource === "api" ? (
                  <p className="rounded-lg bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
                    Cette fonctionnalité nécessite l'exportation de données Instagram. Téléchargez
                    votre export depuis Instagram → Paramètres → Vos activités → Télécharger vos
                    informations.
                  </p>
                ) : !analysis?.dmSuggestionsNoFollowBack?.length ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Aucune suggestion pour le moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analysis.dmSuggestionsNoFollowBack.map((s) => (
                      <DMCard key={s.username} suggestion={s} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: DM · Mutuals ────────────────────────────────────────── */}
          <TabsContent value="dm-mutual">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  DM — Abonnés mutuels non contactés
                </CardTitle>
                <CardDescription>
                  Vous vous suivez mutuellement mais n'avez jamais échangé. Renforcer ces liens
                  booste l'engagement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingSkeleton />
                ) : analysis?.dataSource === "api" ? (
                  <p className="rounded-lg bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
                    {t("interactions.api.inactive_unavailable")}
                  </p>
                ) : !analysis?.dmSuggestionsMutual?.length ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Aucune suggestion pour le moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analysis.dmSuggestionsMutual.map((s) => (
                      <DMCard key={s.username} suggestion={s} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: Unfollow ────────────────────────────────────────────── */}
          <TabsContent value="unfollow">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Trash2 className="h-4 w-4 text-red-400" />
                  {t("interactions.unfollow.title")}
                </CardTitle>
                <CardDescription>{t("interactions.unfollow.description")}</CardDescription>
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
                ) : analysis?.dataSource === "api" ? (
                  <p className="rounded-lg bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
                    {t("interactions.api.unfollow_unavailable")}
                  </p>
                ) : analysis?.unfollowCandidates.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t("interactions.unfollow.empty")}
                  </p>
                ) : (
                  <div>
                    {analysis?.unfollowCandidates.map((c) => (
                      <CandidateRow key={c.username} candidate={c} />
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
