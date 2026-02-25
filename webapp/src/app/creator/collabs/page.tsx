"use client";

import { useState, useCallback } from "react";
import {
  Search,
  Mail,
  FileText,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  X,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInstagramData } from "@/hooks/useInstagramData";
import { useAnimatedStatus } from "@/hooks/useAnimatedStatus";
import { useT } from "@/lib/i18n";
import type { CollabMatch } from "@/app/api/collabs/route";
import { AIFeedbackBar } from "@/components/ui/ai-feedback-bar";

// ─── Type badge colors ─────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  brand: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  creator: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  event: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  media: "text-pink-400 border-pink-400/30 bg-pink-400/10",
};

// ─── Collab Card ──────────────────────────────────────────────────────────────

function CollabCard({
  collab,
  profile,
}: {
  collab: CollabMatch;
  profile: { username?: string; followerCount?: number; bio?: string };
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [emailData, setEmailData] = useState<{ subject: string; body: string } | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const emailGenStatuses = [
    t("collabs.email.status.analyzeProfile"),
    t("collabs.email.status.draftSubject"),
    t("collabs.email.status.customizeContent"),
    t("collabs.email.status.addCTA"),
  ];

  const emailStatus = useAnimatedStatus(isGeneratingEmail, emailGenStatuses);

  const typeLabels: Record<string, string> = {
    brand: t("collabs.type.brand"),
    creator: t("collabs.type.creator"),
    event: t("collabs.type.event"),
    media: t("collabs.type.media"),
  };

  const generateEmail = useCallback(
    async (feedback?: string) => {
      setIsGeneratingEmail(true);
      setExpanded(true);
      try {
        const res = await fetch("/api/collabs/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collab, profile, feedback }),
        });
        const json = await res.json();
        if (json.success && json.data) setEmailData(json.data);
      } finally {
        setIsGeneratingEmail(false);
      }
    },
    [collab, profile]
  );

  const copyEmail = () => {
    if (!emailData) return;
    navigator.clipboard.writeText(
      `${t("collabs.email.subject")}: ${emailData.subject}\n\n${emailData.body}`
    );
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const typeColor = TYPE_COLORS[collab.type] ?? "";
  const typeLabel = typeLabels[collab.type] ?? collab.type;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold">
              {collab.name}
              <span
                className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${typeColor}`}
              >
                {typeLabel}
              </span>
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              📍 {collab.location} · {collab.niche}
            </CardDescription>
          </div>
          {collab.potentialRevenue && (
            <Badge
              variant="outline"
              className="shrink-0 border-amber-400/30 text-xs text-amber-400"
            >
              💰 {collab.potentialRevenue}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-sm text-muted-foreground">{collab.reason}</p>

        {collab.instagramHandle && (
          <a
            href={`https://instagram.com/${collab.instagramHandle.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-violet-400 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {collab.instagramHandle}
          </a>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => generateEmail()}
            disabled={isGeneratingEmail}
          >
            {isGeneratingEmail ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Mail className="h-3 w-3" />
            )}
            {isGeneratingEmail
              ? emailStatus
              : emailData
                ? t("collabs.card.regenerateEmail")
                : t("collabs.card.generateEmail")}
          </Button>

          {emailData && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? t("collabs.card.hide") : t("collabs.card.show")} email
            </Button>
          )}
        </div>

        {expanded && emailData && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("collabs.email.subject")}
            </div>
            <p className="font-semibold">{emailData.subject}</p>
            <div className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("collabs.email.body")}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{emailData.body}</p>
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={copyEmail}>
              <FileText className="h-3 w-3" />
              {copiedEmail ? t("collabs.email.copied") : t("collabs.email.copyButton")}
            </Button>
            <AIFeedbackBar
              onRegenerate={generateEmail}
              isGenerating={isGeneratingEmail}
              placeholder={t("collabs.email.feedbackPlaceholder")}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const INTEREST_SUGGESTIONS = [
  "Voyage",
  "Mode",
  "Food",
  "Tech",
  "Fitness",
  "Beauté",
  "Art",
  "Gaming",
  "Musique",
  "Business",
  "Développement personnel",
  "Photographie",
];

export default function CollabsPage() {
  const t = useT();
  const { data } = useInstagramData();
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState("");
  const [collabs, setCollabs] = useState<CollabMatch[]>([]);
  const [summary, setSummary] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const searchStatuses = [
    t("collabs.search.status.analyzeProfile"),
    t("collabs.search.status.searchPartners"),
    t("collabs.search.status.evaluateOpportunities"),
    t("collabs.search.status.selectMatches"),
    t("collabs.search.status.finalizeResults"),
  ];

  const searchStatus = useAnimatedStatus(isSearching, searchStatuses);

  const toggleInterest = (i: string) => {
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  const addCustomInterest = () => {
    if (!customInterest.trim() || interests.includes(customInterest.trim())) return;
    setInterests((prev) => [...prev, customInterest.trim()]);
    setCustomInterest("");
  };

  const search = useCallback(async () => {
    if (!location || !interests.length) return;
    setIsSearching(true);
    setError("");
    setCollabs([]);
    setSummary("");

    try {
      const res = await fetch("/api/collabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          interests,
          profile: data?.profile ?? {},
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCollabs(json.data.collabs ?? []);
        setSummary(json.data.summary ?? "");
      } else {
        setError(json.error ?? t("collabs.search.error"));
      }
    } catch {
      setError(t("collabs.search.networkError"));
    } finally {
      setIsSearching(false);
    }
  }, [location, interests, data, t]);

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-5 w-5 text-amber-400" />
            {t("collabs.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("collabs.subtitle")}</p>
        </div>

        {/* Search form */}
        <Card className="mb-8">
          <CardContent className="space-y-5 pt-6">
            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("collabs.location.label")}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("collabs.location.placeholder")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("collabs.interests.label")}
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_SUGGESTIONS.map((i) => (
                  <button
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      interests.includes(i)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              {/* Custom interest */}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomInterest()}
                  placeholder={t("collabs.interests.customPlaceholder")}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button size="sm" variant="outline" onClick={addCustomInterest}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {interests.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {interests.map((i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {i}
                      <button onClick={() => toggleInterest(i)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={search}
              disabled={isSearching || !location || !interests.length}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {searchStatus}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  {t("collabs.search.button")}
                </>
              )}
            </Button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </CardContent>
        </Card>

        {/* Results */}
        {summary && (
          <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground/80">
            <span className="font-medium text-amber-400">{t("collabs.summary.prefix")}</span>
            {summary}
          </div>
        )}

        {collabs.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {collabs.map((c) => (
              <CollabCard key={c.id} collab={c} profile={data?.profile ?? {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
