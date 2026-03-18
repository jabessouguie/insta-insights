"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Search,
  Mail,
  MessageCircle,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  X,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  FileText,
  LayoutGrid,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInstagramData } from "@/hooks/useInstagramData";
import { useAnimatedStatus } from "@/hooks/useAnimatedStatus";
import { useT } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CollabMatch } from "@/app/api/collabs/route";
import { AIFeedbackBar } from "@/components/ui/ai-feedback-bar";
import {
  loadTrackings,
  saveTracking,
  needsFollowUp,
  getAllTrackedNames,
  FOLLOWUP_DAYS,
  STATUS_LABELS,
  STATUS_COLORS,
  type CollabTracking,
  type CollabStatus,
} from "@/lib/collab-tracker-store";
import {
  generateMediaKitHTML,
  defaultMediaKitConfig,
  type MediaKitConfig,
} from "@/lib/mediakit-generator";
import { loadBrandSettings } from "@/lib/brand-settings-store";
import { loadUserProfile, getDisplayName } from "@/lib/user-profile-store";
import { loadMediaKitConfig } from "@/lib/mediakit-config-store";
import type { InstagramAnalytics } from "@/types/instagram";
import type { BrandPitchResponse } from "@/app/api/collabs/brand-pitch/route";
import { captureEvent } from "@/lib/posthog";

// ─── Type badge colors ─────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  brand: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  creator: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  event: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  media: "text-pink-400 border-pink-400/30 bg-pink-400/10",
  hotel: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  excursion: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
};

// ─── Validation badge ─────────────────────────────────────────────────────────

type EmailReason = "format" | "no_mx" | "dns_error" | "valid" | null;

function ValidBadge({
  valid,
  reason,
}: {
  valid: boolean | null | undefined;
  reason?: EmailReason;
}) {
  const t = useT();
  if (valid === undefined) return null;

  let icon: React.ReactNode;
  let label: string;

  if (valid === null) {
    icon = <AlertCircle className="h-3 w-3 text-muted-foreground" />;
    label = t("collabs.validate.dns_error");
  } else if (valid) {
    icon = <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    label = t("collabs.validate.valid");
  } else {
    icon = <XCircle className="h-3 w-3 text-red-400" />;
    label =
      reason === "no_mx"
        ? t("collabs.validate.mx_fail")
        : reason === "dns_error"
          ? t("collabs.validate.dns_error")
          : t("collabs.validate.format_error");
  }

  return (
    <span title={label} className="cursor-help">
      {icon}
    </span>
  );
}

// ─── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="outline" className="text-xs" onClick={copy}>
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copié !" : label}
    </Button>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CollabStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Tracking controls ────────────────────────────────────────────────────────

function TrackingPanel({
  collab,
  tracking,
  onUpdate,
  profile,
  language,
}: {
  collab: CollabMatch;
  tracking: CollabTracking;
  onUpdate: (t: CollabTracking) => void;
  profile?: { username?: string; followerCount?: number };
  language?: "fr" | "en";
}) {
  const [followUpEmail, setFollowUpEmail] = useState<{ subject: string; body: string } | null>(
    null
  );
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const generateFollowUpEmail = useCallback(async () => {
    setIsGeneratingFollowUp(true);
    setShowFollowUp(true);
    try {
      const res = await fetch("/api/collabs/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collab, profile: profile ?? {}, language, followUp: true }),
      });
      const json = await res.json();
      if (json.success && json.data)
        setFollowUpEmail(json.data as { subject: string; body: string });
    } finally {
      setIsGeneratingFollowUp(false);
    }
  }, [collab, profile, language]);

  const markSent = (channel: "email" | "dm") => {
    captureEvent("collab_contact_sent", { channel });
    const updated: CollabTracking = {
      ...tracking,
      status: channel === "email" ? "email_sent" : "dm_sent",
      sentAt: new Date().toISOString(),
    };
    saveTracking(updated);
    onUpdate(updated);
  };

  const markReply = (positive: boolean) => {
    const updated: CollabTracking = {
      ...tracking,
      status: positive ? "replied_positive" : "replied_negative",
      repliedAt: new Date().toISOString(),
    };
    saveTracking(updated);
    onUpdate(updated);
  };

  const markNotInterested = () => {
    const updated: CollabTracking = { ...tracking, status: "not_interested" };
    saveTracking(updated);
    onUpdate(updated);
  };

  const markFollowUpSent = () => {
    const updated: CollabTracking = {
      ...tracking,
      followUpSentAt: new Date().toISOString(),
    };
    saveTracking(updated);
    onUpdate(updated);
  };

  const isFollowUp = needsFollowUp(tracking);

  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={tracking.status} />
        {isFollowUp && (
          <span className="inline-flex items-center gap-1 rounded border border-orange-400/30 bg-orange-400/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
            <RefreshCw className="h-2.5 w-2.5" />
            Relance recommandée
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {/* Mark as sent */}
        {tracking.status === "not_contacted" && collab.contactEmail && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px]"
            onClick={() => markSent("email")}
          >
            <Mail className="h-2.5 w-2.5" />
            Email envoyé
          </Button>
        )}
        {tracking.status === "not_contacted" && collab.instagramHandle && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px]"
            onClick={() => markSent("dm")}
          >
            <MessageCircle className="h-2.5 w-2.5" />
            DM envoyé
          </Button>
        )}

        {/* Reply tracking */}
        {(tracking.status === "email_sent" || tracking.status === "dm_sent") && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-6 border-emerald-500/30 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => markReply(true)}
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              Réponse positive
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 border-red-500/30 px-2 text-[10px] text-red-400 hover:bg-red-500/10"
              onClick={() => markReply(false)}
            >
              <XCircle className="h-2.5 w-2.5" />
              Réponse négative
            </Button>
          </>
        )}

        {/* Follow-up sent */}
        {isFollowUp && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-6 border-orange-500/30 px-2 text-[10px] text-orange-400 hover:bg-orange-500/10"
              onClick={generateFollowUpEmail}
              disabled={isGeneratingFollowUp}
            >
              {isGeneratingFollowUp ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <RefreshCw className="h-2.5 w-2.5" />
              )}
              {followUpEmail ? "Régénérer la relance" : "Générer email de relance"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 border-orange-500/30 px-2 text-[10px] text-orange-400 hover:bg-orange-500/10"
              onClick={markFollowUpSent}
            >
              <Check className="h-2.5 w-2.5" />
              Relance envoyée
            </Button>
          </>
        )}

        {/* Not interested */}
        {tracking.status === "not_contacted" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-red-400"
            onClick={markNotInterested}
          >
            <X className="h-2.5 w-2.5" />
            Pas intéressé
          </Button>
        )}
      </div>

      {/* Follow-up email panel */}
      {showFollowUp && followUpEmail && (
        <div className="space-y-2 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-400">
              <RefreshCw className="h-3 w-3" />
              Email de relance
            </div>
            <button
              type="button"
              onClick={() => setShowFollowUp(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] font-medium text-muted-foreground">
            Objet : {followUpEmail.subject}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{followUpEmail.body}</p>
          <CopyButton
            text={`Objet : ${followUpEmail.subject}\n\n${followUpEmail.body}`}
            label="Copier la relance"
          />
        </div>
      )}

      {/* Sent date */}
      {tracking.sentAt && (
        <p className="text-[10px] text-muted-foreground">
          Contacté le {new Date(tracking.sentAt).toLocaleDateString("fr-FR")}
          {tracking.repliedAt &&
            ` · Réponse le ${new Date(tracking.repliedAt).toLocaleDateString("fr-FR")}`}
        </p>
      )}
    </div>
  );
}

// ─── DM Instagram panel ────────────────────────────────────────────────────────

function DMPanel({
  collab,
  profile,
  tracking,
  onTrackingUpdate,
  language,
}: {
  collab: CollabMatch;
  profile: { username?: string; followerCount?: number };
  tracking: CollabTracking;
  onTrackingUpdate: (t: CollabTracking) => void;
  language?: "fr" | "en";
}) {
  const [dmText, setDmText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const genStatuses = ["Analyse du profil...", "Rédaction du message...", "Ajustement du ton..."];
  const genStatus = useAnimatedStatus(isGenerating, genStatuses);

  const generate = useCallback(
    async (feedback?: string) => {
      setIsGenerating(true);
      setShowPanel(true);
      try {
        const res = await fetch("/api/collabs/dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collab, profile, feedback, language }),
        });
        const json = await res.json();
        if (json.success && json.data) setDmText(json.data.message as string);
      } finally {
        setIsGenerating(false);
      }
    },
    [collab, profile]
  );

  const igUrl = collab.instagramHandle
    ? `https://instagram.com/${collab.instagramHandle.replace("@", "")}`
    : null;

  const handleOpenDM = () => {
    if (igUrl) {
      window.open(igUrl, "_blank");
    }
    // Mark as DM sent
    const updated: CollabTracking = {
      ...tracking,
      status: "dm_sent",
      sentAt: new Date().toISOString(),
    };
    saveTracking(updated);
    onTrackingUpdate(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {igUrl && (
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-violet-400 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {collab.instagramHandle}
          </a>
        )}
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={() => generate()}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <MessageCircle className="h-3 w-3 text-violet-400" />
          )}
          {isGenerating ? genStatus : dmText ? "Régénérer le DM" : "Générer un DM Instagram"}
        </Button>
        {dmText && (
          <button
            onClick={() => setShowPanel((p) => !p)}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPanel ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {showPanel && dmText && (
        <div className="space-y-2.5 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-400">
            <MessageCircle className="h-3 w-3" />
            Message Instagram Direct
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{dmText}</p>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={dmText} label="Copier le DM" />
            {igUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-violet-400"
                onClick={handleOpenDM}
              >
                <ExternalLink className="h-3 w-3" />
                Ouvrir le profil (DM envoyé)
              </Button>
            )}
          </div>
          <AIFeedbackBar
            onRegenerate={generate}
            isGenerating={isGenerating}
            placeholder="Trop formel ? Plus court ? Précise ton idée..."
          />
        </div>
      )}
    </div>
  );
}

// ─── Email panel ───────────────────────────────────────────────────────────────

function EmailPanel({
  collab,
  profile,
  tracking,
  onTrackingUpdate,
  instagramData,
  language,
}: {
  collab: CollabMatch;
  profile: { username?: string; followerCount?: number };
  tracking: CollabTracking;
  onTrackingUpdate: (t: CollabTracking) => void;
  instagramData?: InstagramAnalytics;
  language?: "fr" | "en";
}) {
  const t = useT();
  const [emailData, setEmailData] = useState<{ subject: string; body: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [mediaKitUrl, setMediaKitUrl] = useState<string | null>(null);
  const [isGeneratingKit, setIsGeneratingKit] = useState(false);

  const genStatuses = [
    t("collabs.email.status.analyzeProfile"),
    t("collabs.email.status.draftSubject"),
    t("collabs.email.status.customizeContent"),
    t("collabs.email.status.addCTA"),
  ];
  const genStatus = useAnimatedStatus(isGenerating, genStatuses);

  const generateAdaptedMediaKit = useCallback(
    async (analytics: InstagramAnalytics) => {
      setIsGeneratingKit(true);
      try {
        const { profile: p, metrics, audienceInsights, posts } = analytics;
        const collabContext = `${collab.name} (niche : ${collab.niche}, type : ${collab.type})`;

        const res = await fetch("/api/mediakit/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: p.username,
            followerCount: p.followerCount,
            engagementRate: metrics.engagementRate,
            bio: p.bio,
            topCountries: audienceInsights?.topCountries
              ? Object.entries(audienceInsights.topCountries)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([c]) => c)
              : [],
            audienceGender: audienceInsights?.genderSplit,
            posts: posts?.slice(0, 10).map((post) => ({ caption: post.caption })),
            collabContext,
          }),
        });
        const json = (await res.json()) as {
          success: boolean;
          tagline?: string;
          services?: string[];
          ratePerPost?: string;
        };

        const brandSettings = loadBrandSettings();
        const userProfile = loadUserProfile();
        const displayName = getDisplayName(userProfile);

        const config: MediaKitConfig = {
          ...defaultMediaKitConfig,
          primaryColor: brandSettings.primaryColor,
          secondaryColor: brandSettings.secondaryColor,
          accentColor: brandSettings.accentColor,
          fontTitle: brandSettings.fontTitle,
          fontBody: brandSettings.fontBody,
          tagline: json.success && json.tagline ? json.tagline : defaultMediaKitConfig.tagline,
          services: json.success && json.services ? json.services : defaultMediaKitConfig.services,
          ratePerPost: json.success && json.ratePerPost ? json.ratePerPost : "",
          contactEmail: userProfile.email || "",
          ...(displayName && { displayName }),
          ...(userProfile.profilePhotoBase64 && { profilePicUrl: userProfile.profilePhotoBase64 }),
        };

        const html = generateMediaKitHTML(analytics, config);
        const blob = new Blob([html], { type: "text/html" });
        setMediaKitUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.error("Adapted media kit error:", err);
      } finally {
        setIsGeneratingKit(false);
      }
    },
    [collab]
  );

  const generate = useCallback(
    async (feedback?: string) => {
      setIsGenerating(true);
      setShowPanel(true);
      try {
        const res = await fetch("/api/collabs/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collab, profile, feedback, language }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setEmailData(json.data as { subject: string; body: string });
          if (instagramData) {
            void generateAdaptedMediaKit(instagramData);
          }
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [collab, profile, instagramData, generateAdaptedMediaKit]
  );

  const fullEmailText = emailData ? `Objet : ${emailData.subject}\n\n${emailData.body}` : "";

  const mailtoUrl =
    collab.contactEmail && emailData
      ? `mailto:${collab.contactEmail}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`
      : collab.contactEmail
        ? `mailto:${collab.contactEmail}`
        : null;

  const handleOpenMail = () => {
    if (mailtoUrl) {
      window.open(mailtoUrl, "_blank");
    }
    // Mark as email sent
    const updated: CollabTracking = {
      ...tracking,
      status: "email_sent",
      sentAt: new Date().toISOString(),
    };
    saveTracking(updated);
    onTrackingUpdate(updated);
  };

  const kitFileName = `mediakit-${collab.name.replace(/\s+/g, "-").toLowerCase()}.html`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {collab.contactEmail && (
          <span className="font-mono text-xs text-muted-foreground">{collab.contactEmail}</span>
        )}
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={() => generate()}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Mail className="h-3 w-3 text-sky-400" />
          )}
          {isGenerating
            ? genStatus
            : emailData
              ? t("collabs.card.regenerateEmail")
              : t("collabs.card.generateEmail")}
        </Button>
        {emailData && (
          <button
            onClick={() => setShowPanel((p) => !p)}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPanel ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {showPanel && emailData && (
        <div className="space-y-2.5 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-400">
            <Mail className="h-3 w-3" />
            Email de collaboration
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("collabs.email.subject")}
            </div>
            <p className="text-sm font-semibold">{emailData.subject}</p>
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("collabs.email.body")}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{emailData.body}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={fullEmailText} label="Copier l'email" />
            {mailtoUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-sky-400"
                onClick={handleOpenMail}
              >
                <ExternalLink className="h-3 w-3" />
                Ouvrir dans Mail (marquer comme envoyé)
              </Button>
            )}
            {/* Adapted media kit — PDF + HTML */}
            {mediaKitUrl ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-amber-400"
                  onClick={() => {
                    const win = window.open(mediaKitUrl, "_blank");
                    if (!win) return;
                    win.addEventListener("load", () => {
                      win.focus();
                      win.print();
                    });
                  }}
                >
                  <FileText className="h-3 w-3" />
                  {t("collabs.mediakit.downloadPdf")}
                </Button>
                <a href={mediaKitUrl} download={kitFileName}>
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {t("collabs.mediakit.downloadHtml")}
                  </Button>
                </a>
              </>
            ) : isGeneratingKit ? (
              <Button size="sm" variant="ghost" className="text-xs text-amber-400/60" disabled>
                <Loader2 className="h-3 w-3 animate-spin" />
                Génération du Media Kit...
              </Button>
            ) : (
              <a href="/creator/mediakit" target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" className="text-xs text-amber-400">
                  <FileText className="h-3 w-3" />
                  Générer le Media Kit (à joindre)
                </Button>
              </a>
            )}
          </div>
          <AIFeedbackBar
            onRegenerate={generate}
            isGenerating={isGenerating}
            placeholder={t("collabs.email.feedbackPlaceholder")}
          />
        </div>
      )}
    </div>
  );
}

// ─── Collab Card ──────────────────────────────────────────────────────────────

function CollabCard({
  collab,
  profile,
  tracking,
  validation,
  onTrackingUpdate,
  instagramData,
  language,
}: {
  collab: CollabMatch;
  profile: { username?: string; followerCount?: number; bio?: string };
  tracking: CollabTracking;
  validation?: { emailValid: boolean | null; emailReason?: EmailReason; igValid: boolean | null };
  onTrackingUpdate: (t: CollabTracking) => void;
  language?: "fr" | "en";
  instagramData?: InstagramAnalytics;
}) {
  const t = useT();

  const typeLabels: Record<string, string> = {
    brand: t("collabs.type.brand"),
    creator: t("collabs.type.creator"),
    event: t("collabs.type.event"),
    media: t("collabs.type.media"),
    hotel: t("collabs.type.hotel"),
    excursion: t("collabs.type.excursion"),
  };

  const typeColor = TYPE_COLORS[collab.type] ?? "";
  const typeLabel = typeLabels[collab.type] ?? collab.type;

  const hasDM = !!collab.instagramHandle;
  const hasEmail = !!collab.contactEmail;

  const isHidden = tracking.status === "not_interested";

  if (isHidden) {
    return (
      <Card className="overflow-hidden opacity-40">
        <CardContent className="flex items-center justify-between py-3 pt-3">
          <p className="text-sm text-muted-foreground line-through">{collab.name}</p>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px]"
            onClick={() => {
              const updated: CollabTracking = { ...tracking, status: "not_contacted" };
              saveTracking(updated);
              onTrackingUpdate(updated);
            }}
          >
            Rétablir
          </Button>
        </CardContent>
      </Card>
    );
  }

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
              {hasDM && (
                <span className="inline-flex items-center gap-1 rounded border border-violet-400/30 bg-violet-400/10 px-1.5 py-0.5 text-[10px] text-violet-400">
                  <MessageCircle className="h-2.5 w-2.5" />
                  DM
                </span>
              )}
              {hasEmail && (
                <span className="inline-flex items-center gap-1 rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[10px] text-sky-400">
                  <Mail className="h-2.5 w-2.5" />
                  Email
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              📍 {collab.location} · {collab.niche}
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {collab.potentialRevenue && (
              <Badge variant="outline" className="border-amber-400/30 text-xs text-amber-400">
                💰 {collab.potentialRevenue}
              </Badge>
            )}
            {collab.relevanceScore !== undefined && (
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                  collab.relevanceScore >= 8
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                    : collab.relevanceScore >= 5
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                      : "border-muted text-muted-foreground"
                }`}
              >
                ★ {collab.relevanceScore}/10
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <p className="text-sm text-muted-foreground">{collab.reason}</p>

        {/* ── Tracking ── */}
        <TrackingPanel
          collab={collab}
          tracking={tracking}
          onUpdate={onTrackingUpdate}
          profile={profile}
          language={language}
        />

        {/* ── DM channel ── */}
        {hasDM && (
          <div className="flex items-center gap-1.5">
            <ValidBadge valid={validation?.igValid} />
            <DMPanel
              collab={collab}
              profile={profile}
              tracking={tracking}
              onTrackingUpdate={onTrackingUpdate}
              language={language}
            />
          </div>
        )}

        {/* Divider */}
        {hasDM && hasEmail && (
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* ── Email channel ── */}
        {hasEmail && (
          <div className="flex items-start gap-1.5">
            <ValidBadge valid={validation?.emailValid} reason={validation?.emailReason} />
            <div className="flex-1">
              <EmailPanel
                collab={collab}
                profile={profile}
                tracking={tracking}
                onTrackingUpdate={onTrackingUpdate}
                instagramData={instagramData}
                language={language}
              />
            </div>
          </div>
        )}

        {/* Fallback */}
        {!hasDM && !hasEmail && collab.websiteHint && (
          <p className="text-xs text-muted-foreground">
            🔍 Recherche :{" "}
            <a
              href={`https://google.com/search?q=${encodeURIComponent(collab.websiteHint + " contact partenariat")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {collab.websiteHint}
            </a>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tracker Card ─────────────────────────────────────────────────────────────

function TrackerCard({
  tracking,
  onUpdate,
}: {
  tracking: CollabTracking;
  onUpdate: (t: CollabTracking) => void;
}) {
  const [notes, setNotes] = useState(tracking.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const needsFollowup = needsFollowUp(tracking);

  const move = (status: CollabStatus) => {
    const extra =
      status === "email_sent" || status === "dm_sent"
        ? { sentAt: new Date().toISOString() }
        : status === "replied_positive" || status === "replied_negative"
          ? { repliedAt: new Date().toISOString() }
          : {};
    const updated: CollabTracking = { ...tracking, status, ...extra };
    saveTracking(updated);
    onUpdate(updated);
  };

  const saveNotes = () => {
    const updated: CollabTracking = { ...tracking, notes };
    saveTracking(updated);
    onUpdate(updated);
    setEditingNotes(false);
  };

  const sentDate = tracking.sentAt ? new Date(tracking.sentAt).toLocaleDateString("fr-FR") : null;
  const repliedDate = tracking.repliedAt
    ? new Date(tracking.repliedAt).toLocaleDateString("fr-FR")
    : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-2.5 p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{tracking.collabName}</p>
          <StatusBadge status={tracking.status} />
        </div>

        {/* Meta */}
        <div className="space-y-0.5">
          {tracking.collabEmail && (
            <a
              href={`mailto:${tracking.collabEmail}`}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
            >
              <Mail className="h-2.5 w-2.5" />
              {tracking.collabEmail}
            </a>
          )}
          {tracking.collabHandle && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageCircle className="h-2.5 w-2.5" />
              {tracking.collabHandle}
            </div>
          )}
          {sentDate && <p className="text-[10px] text-muted-foreground">Contacté le {sentDate}</p>}
          {repliedDate && (
            <p className="text-[10px] text-muted-foreground">Répondu le {repliedDate}</p>
          )}
        </div>

        {/* Follow-up alert */}
        {needsFollowup && (
          <div className="flex items-center gap-1.5 rounded border border-orange-400/30 bg-orange-400/10 px-2 py-1 text-[10px] text-orange-400">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            Relance recommandée ({FOLLOWUP_DAYS}j sans réponse)
          </div>
        )}

        {/* Notes */}
        {editingNotes ? (
          <div className="space-y-1">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Vos notes…"
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-6 px-2 text-[10px]" onClick={saveNotes}>
                Sauvegarder
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px] text-muted-foreground"
                onClick={() => {
                  setNotes(tracking.notes ?? "");
                  setEditingNotes(false);
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingNotes(true)}
            className="w-full rounded border border-dashed border-border px-2 py-1 text-left text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            {tracking.notes || "＋ Ajouter une note…"}
          </button>
        )}

        {/* Quick status actions */}
        <div className="flex flex-wrap gap-1">
          {tracking.status !== "email_sent" && tracking.status !== "dm_sent" && (
            <button
              onClick={() => move("email_sent")}
              className="rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[10px] text-sky-400 transition-colors hover:bg-sky-400/20"
            >
              ✉ Email envoyé
            </button>
          )}
          {tracking.status !== "replied_positive" && (
            <button
              onClick={() => move("replied_positive")}
              className="rounded border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-400 transition-colors hover:bg-emerald-400/20"
            >
              ✓ Positif
            </button>
          )}
          {tracking.status !== "replied_negative" && (
            <button
              onClick={() => move("replied_negative")}
              className="rounded border border-orange-400/30 bg-orange-400/10 px-1.5 py-0.5 text-[10px] text-orange-400 transition-colors hover:bg-orange-400/20"
            >
              Négatif
            </button>
          )}
          {tracking.status !== "not_interested" && (
            <button
              onClick={() => move("not_interested")}
              className="rounded border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 text-[10px] text-red-400 transition-colors hover:bg-red-400/20"
            >
              ✗ Ignorer
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tracker Board ────────────────────────────────────────────────────────────

const BOARD_COLUMNS: {
  id: string;
  label: string;
  statuses: CollabStatus[];
  accent: string;
  border: string;
  bg: string;
}[] = [
  {
    id: "prospect",
    label: "Prospects",
    statuses: ["not_contacted"],
    accent: "text-muted-foreground",
    border: "border-border",
    bg: "bg-muted/20",
  },
  {
    id: "inprogress",
    label: "En cours",
    statuses: ["email_sent", "dm_sent"],
    accent: "text-sky-400",
    border: "border-sky-500/20",
    bg: "bg-sky-500/5",
  },
  {
    id: "positive",
    label: "Réponse positive",
    statuses: ["replied_positive"],
    accent: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
  {
    id: "closed",
    label: "Fermé / Ignoré",
    statuses: ["not_interested", "replied_negative"],
    accent: "text-orange-400",
    border: "border-orange-500/20",
    bg: "bg-orange-500/5",
  },
];

function CollabTrackerBoard({
  trackings,
  onUpdate,
}: {
  trackings: Record<string, CollabTracking>;
  onUpdate: (t: CollabTracking) => void;
}) {
  const all = Object.values(trackings).filter((t) => t.collabName);
  const totalContacted = all.filter((t) => t.status !== "not_contacted").length;

  if (all.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
        <LayoutGrid className="h-10 w-10 opacity-20" />
        <p className="text-sm font-medium">Aucun suivi en cours</p>
        <p className="max-w-xs text-xs">
          Lance une recherche dans le Collab Finder et interagis avec les résultats — ils
          apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div>
      {totalContacted > 0 && (
        <p className="mb-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalContacted}</span> collab
          {totalContacted > 1 ? "s" : ""} contactée{totalContacted > 1 ? "s" : ""} ·{" "}
          <span className="font-semibold text-emerald-400">
            {all.filter((t) => t.status === "replied_positive").length}
          </span>{" "}
          positive{all.filter((t) => t.status === "replied_positive").length > 1 ? "s" : ""}
        </p>
      )}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: "860px" }}>
          {BOARD_COLUMNS.map((col) => {
            const cards = all.filter((t) => col.statuses.includes(t.status));
            return (
              <div key={col.id} className="flex min-w-[210px] flex-1 flex-col">
                <div
                  className={`mb-3 flex items-center gap-2 rounded-lg border ${col.border} ${col.bg} px-3 py-2`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${col.accent}`}>
                    {col.label}
                  </span>
                  <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {cards.map((t) => (
                    <TrackerCard key={t.collabId} tracking={t} onUpdate={onUpdate} />
                  ))}
                  {cards.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-[10px] text-muted-foreground">
                      Aucune collab
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Quick Pitch Panel ────────────────────────────────────────────────────────

function QuickPitchPanel({
  profile,
  instagramData,
  language,
}: {
  profile: { username?: string; followerCount?: number; bio?: string };
  instagramData?: InstagramAnalytics;
  language?: "fr" | "en";
}) {
  const [brandName, setBrandName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<NonNullable<BrandPitchResponse["data"]> | null>(null);
  const [mediaKitUrl, setMediaKitUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const generate = useCallback(async () => {
    if (!brandName.trim() || isGenerating) return;
    setIsGenerating(true);
    setResult(null);
    setMediaKitUrl(null);
    try {
      const res = await fetch("/api/collabs/brand-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          profile,
          language,
          posts: instagramData?.posts
            ?.filter((p) => p.caption?.trim())
            .slice(0, 5)
            .map((p) => ({ caption: p.caption })),
          topCountries: instagramData?.audienceInsights?.topCountries
            ? Object.entries(instagramData.audienceInsights.topCountries)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([c]) => c)
            : [],
          audienceGender: instagramData?.audienceInsights?.genderSplit,
          engagementRate: instagramData?.metrics?.engagementRate,
          followerCount: instagramData?.profile?.followerCount,
        }),
      });
      const json = (await res.json()) as BrandPitchResponse;
      if (json.success && json.data) {
        setResult(json.data);
        setOpen(true);

        // Build adapted media kit
        if (instagramData) {
          const brandSettings = loadBrandSettings();
          const userProfile = loadUserProfile();
          const savedConfig = loadMediaKitConfig();
          const displayName = getDisplayName(userProfile);

          const config: MediaKitConfig = {
            ...defaultMediaKitConfig,
            ...savedConfig,
            primaryColor: brandSettings.primaryColor,
            secondaryColor: brandSettings.secondaryColor,
            accentColor: brandSettings.accentColor,
            fontTitle: brandSettings.fontTitle,
            fontBody: brandSettings.fontBody,
            tagline: json.data.mediaKit.tagline,
            services: json.data.mediaKit.services,
            ratePerPost: json.data.mediaKit.ratePerPost,
            contactEmail: userProfile.email || savedConfig.contactEmail || "",
            ...(displayName && { displayName }),
            ...(userProfile.profilePhotoBase64 && {
              profilePicUrl: userProfile.profilePhotoBase64,
            }),
          };

          const html = generateMediaKitHTML(instagramData, config);
          const blob = new Blob([html], { type: "text/html" });
          setMediaKitUrl(URL.createObjectURL(blob));
        }
      }
    } catch (err) {
      console.error("Brand pitch error:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [brandName, profile, instagramData, language, isGenerating]);

  const fullEmailText = result ? `Objet : ${result.email.subject}\n\n${result.email.body}` : "";
  const kitFileName = `mediakit-${brandName.trim().replace(/\s+/g, "-").toLowerCase()}.html`;

  const copyEmail = () => {
    navigator.clipboard.writeText(fullEmailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoUrl = result?.brandInfo?.contactEmail
    ? `mailto:${result.brandInfo.contactEmail}?subject=${encodeURIComponent(result.email.subject)}&body=${encodeURIComponent(result.email.body)}`
    : null;

  return (
    <Card className="mb-6 border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-400">
          <Sparkles className="h-4 w-4" />
          Pitch express
          <span className="ml-1 text-[10px] font-normal normal-case text-muted-foreground">
            Email + Media Kit personnalisé pour une marque
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="Nom de la marque (ex: Nike, L'Oréal, Vogue…)"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/30"
          />
          <Button
            onClick={generate}
            disabled={isGenerating || !brandName.trim()}
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? "Génération…" : "Générer"}
          </Button>
        </div>

        {result && open && (
          <div className="space-y-4 rounded-lg border border-amber-500/20 bg-background/60 p-4">
            {/* Brand info */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-semibold text-amber-400">{brandName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{result.brandInfo.niche}</span>
              {result.brandInfo.instagramHandle && (
                <a
                  href={`https://instagram.com/${result.brandInfo.instagramHandle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-violet-400 hover:underline"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  {result.brandInfo.instagramHandle}
                </a>
              )}
              {result.brandInfo.contactEmail && (
                <span className="font-mono text-sky-400">{result.brandInfo.contactEmail}</span>
              )}
            </div>

            {/* Email preview */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Objet
              </div>
              <p className="text-sm font-semibold">{result.email.subject}</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Corps
              </div>
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {result.email.body}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="text-xs" onClick={copyEmail}>
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copié !" : "Copier l'email"}
              </Button>
              {mailtoUrl && (
                <a href={mailtoUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="text-xs text-sky-400">
                    <ExternalLink className="h-3 w-3" />
                    Ouvrir dans Mail
                  </Button>
                </a>
              )}
              {mediaKitUrl ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-amber-400"
                    onClick={() => {
                      const win = window.open(mediaKitUrl, "_blank");
                      if (!win) return;
                      win.addEventListener("load", () => {
                        win.focus();
                        win.print();
                      });
                    }}
                  >
                    <FileText className="h-3 w-3" />
                    Télécharger PDF
                  </Button>
                  <a href={mediaKitUrl} download={kitFileName}>
                    <Button size="sm" variant="ghost" className="text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      HTML
                    </Button>
                  </a>
                </>
              ) : isGenerating ? null : (
                <Button size="sm" variant="ghost" className="text-xs text-amber-400/50" disabled>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Media Kit…
                </Button>
              )}
            </div>
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
  "Hôtels & Hébergement",
  "Excursions & Activités",
];

export default function CollabsPage() {
  const t = useT();
  const { lang } = useLanguage();
  const { data } = useInstagramData();
  const [pageTab, setPageTab] = useState<"finder" | "tracker">("finder");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState("");
  const [count, setCount] = useState(15);
  const [collabs, setCollabs] = useState<CollabMatch[]>([]);
  const [summary, setSummary] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  // Tracking state
  const [trackings, setTrackings] = useState<Record<string, CollabTracking>>({});

  // Filter state
  const [filterAccountTypes, setFilterAccountTypes] = useState<string[]>([]);
  const [filterCollabFormats, setFilterCollabFormats] = useState<string[]>([]);

  // Validation state
  const [validations, setValidations] = useState<
    Record<
      string,
      { emailValid: boolean | null; emailReason?: EmailReason; igValid: boolean | null }
    >
  >({});
  const [isValidating, setIsValidating] = useState(false);

  // Load trackings on mount
  useEffect(() => {
    const all = loadTrackings();
    const map: Record<string, CollabTracking> = {};
    for (const t of all) map[t.collabId] = t;
    setTrackings(map);
  }, []);

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

  const handleTrackingUpdate = (updated: CollabTracking) => {
    setTrackings((prev) => ({ ...prev, [updated.collabId]: updated }));
  };

  const getOrCreateTracking = (collab: CollabMatch): CollabTracking => {
    if (trackings[collab.id]) return trackings[collab.id];
    const t: CollabTracking = {
      collabId: collab.id,
      collabName: collab.name,
      collabEmail: collab.contactEmail,
      collabHandle: collab.instagramHandle,
      status: "not_contacted",
    };
    return t;
  };

  const search = useCallback(async () => {
    if (!location || !interests.length) return;
    setIsSearching(true);
    setError("");
    setCollabs([]);
    setSummary("");
    setValidations({});

    // Exclude ALL previously tracked collabs so the finder always returns fresh results
    const excludeNames = getAllTrackedNames();

    try {
      const res = await fetch("/api/collabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          interests,
          profile: data?.profile ?? {},
          excludeNames,
          count,
          language: lang,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const newCollabs = (json.data.collabs as CollabMatch[]) ?? [];
        setCollabs(newCollabs);
        setSummary((json.data.summary as string) ?? "");

        // Init trackings for new collabs
        setTrackings((prev) => {
          const updated = { ...prev };
          for (const c of newCollabs) {
            if (!updated[c.id]) {
              updated[c.id] = {
                collabId: c.id,
                collabName: c.name,
                collabEmail: c.contactEmail,
                collabHandle: c.instagramHandle,
                status: "not_contacted",
              };
            }
          }
          return updated;
        });

        // Auto-validate contacts in the background
        if (newCollabs.length > 0) {
          void (async () => {
            setIsValidating(true);
            const results: Record<
              string,
              { emailValid: boolean | null; emailReason?: EmailReason; igValid: boolean | null }
            > = {};
            await Promise.allSettled(
              newCollabs.map(async (c) => {
                if (!c.instagramHandle && !c.contactEmail) return;
                try {
                  const vRes = await fetch("/api/collabs/validate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      instagramHandle: c.instagramHandle,
                      email: c.contactEmail,
                    }),
                  });
                  const vJson = await vRes.json();
                  results[c.id] = {
                    emailValid: vJson.emailValid,
                    emailReason: vJson.emailReason as EmailReason,
                    igValid: vJson.instagramValid,
                  };
                } catch {
                  results[c.id] = { emailValid: null, igValid: null };
                }
              })
            );
            setValidations(results);
            setIsValidating(false);
          })();
        }
      } else {
        setError((json.error as string) ?? t("collabs.search.error"));
      }
    } catch {
      setError(t("collabs.search.networkError"));
    } finally {
      setIsSearching(false);
    }
  }, [location, interests, data, t, count]);

  const validateAll = useCallback(async () => {
    if (!collabs.length) return;
    setIsValidating(true);
    const results: typeof validations = {};

    await Promise.allSettled(
      collabs.map(async (c) => {
        if (!c.instagramHandle && !c.contactEmail) return;
        try {
          const res = await fetch("/api/collabs/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instagramHandle: c.instagramHandle,
              email: c.contactEmail,
            }),
          });
          const json = await res.json();
          results[c.id] = {
            emailValid: json.emailValid,
            emailReason: json.emailReason as EmailReason,
            igValid: json.instagramValid,
          };
        } catch {
          results[c.id] = { emailValid: null, igValid: null };
        }
      })
    );

    setValidations(results);
    setIsValidating(false);
  }, [collabs]);

  const hiddenCount = collabs.filter((c) => trackings[c.id]?.status === "not_interested").length;

  const filteredCollabs = collabs.filter((c) => {
    if (!showHidden && trackings[c.id]?.status === "not_interested") return false;
    if (filterAccountTypes.length > 0 && !filterAccountTypes.includes(c.type)) return false;
    if (
      filterCollabFormats.length > 0 &&
      !filterCollabFormats.some((f) => (c.collabFormats as string[] | undefined)?.includes(f))
    )
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="h-5 w-5 text-amber-400" />
              {t("collabs.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("collabs.subtitle")}</p>
          </div>
          {/* Tab switcher */}
          <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setPageTab("finder")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${pageTab === "finder" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Search className="h-3.5 w-3.5" />
              Finder
            </button>
            <button
              onClick={() => setPageTab("tracker")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${pageTab === "tracker" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Suivi
              {Object.values(trackings).filter((t) => t.collabName).length > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                  {Object.values(trackings).filter((t) => t.collabName).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tracker board */}
        {pageTab === "tracker" && (
          <CollabTrackerBoard trackings={trackings} onUpdate={handleTrackingUpdate} />
        )}

        {/* Search form + results */}
        {pageTab === "finder" && (
          <>
            {/* Quick brand pitch */}
            <QuickPitchPanel
              profile={data?.profile ?? {}}
              instagramData={data ?? undefined}
              language={lang}
            />

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

                {/* Count selector */}
                <div className="flex items-center gap-3">
                  <label className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Nombre de résultats
                  </label>
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="flex-1 accent-amber-400"
                    />
                    <input
                      type="number"
                      min={1}
                      value={count}
                      onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
                      className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-center text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
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

            {/* Results toolbar */}
            {collabs.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {summary && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-amber-400">
                        {t("collabs.summary.prefix")}
                      </span>
                      {summary}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hiddenCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs text-muted-foreground"
                      onClick={() => setShowHidden((p) => !p)}
                    >
                      {showHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showHidden ? "Masquer" : `Afficher`} {hiddenCount} ignoré
                      {hiddenCount > 1 ? "s" : ""}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    onClick={validateAll}
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    )}
                    {isValidating ? "Vérification..." : "Vérifier les contacts"}
                  </Button>
                </div>
              </div>
            )}

            {/* Summary (if no toolbar shown) */}
            {summary && collabs.length === 0 && (
              <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground/80">
                <span className="font-medium text-amber-400">{t("collabs.summary.prefix")}</span>
                {summary}
              </div>
            )}

            {/* ── Filters ── */}
            {collabs.length > 0 && (
              <div className="mb-4 space-y-2">
                {/* Account type filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("collabs.filter.accountType")}
                  </span>
                  {(["brand", "creator", "hotel", "excursion", "event", "media"] as const).map(
                    (typ) => {
                      const active = filterAccountTypes.includes(typ);
                      return (
                        <button
                          key={typ}
                          onClick={() =>
                            setFilterAccountTypes((prev) =>
                              active ? prev.filter((x) => x !== typ) : [...prev, typ]
                            )
                          }
                          className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                            active
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {t(`collabs.type.${typ}` as Parameters<typeof t>[0])}
                        </button>
                      );
                    }
                  )}
                </div>
                {/* Collab format filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("collabs.filter.collabFormat")}
                  </span>
                  {(
                    [
                      "partenariat",
                      "nuitee_offerte",
                      "code_promo",
                      "sponsorise",
                      "ugc",
                      "ambassador",
                    ] as const
                  ).map((fmt) => {
                    const active = filterCollabFormats.includes(fmt);
                    return (
                      <button
                        key={fmt}
                        onClick={() =>
                          setFilterCollabFormats((prev) =>
                            active ? prev.filter((x) => x !== fmt) : [...prev, fmt]
                          )
                        }
                        className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                          active
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {t(`collabs.format.${fmt}` as Parameters<typeof t>[0])}
                      </button>
                    );
                  })}
                </div>
                {/* Clear + count */}
                {(filterAccountTypes.length > 0 || filterCollabFormats.length > 0) && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {t("collabs.filter.results").replace("{n}", String(filteredCollabs.length))}
                    </span>
                    <button
                      onClick={() => {
                        setFilterAccountTypes([]);
                        setFilterCollabFormats([]);
                      }}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      {t("collabs.filter.clearAll")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Collab cards */}
            {filteredCollabs.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredCollabs.map((c) => {
                  const tracking = getOrCreateTracking(c);
                  return (
                    <CollabCard
                      key={c.id}
                      collab={c}
                      profile={data?.profile ?? {}}
                      tracking={tracking}
                      validation={validations[c.id]}
                      onTrackingUpdate={handleTrackingUpdate}
                      instagramData={data ?? undefined}
                      language={lang}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
