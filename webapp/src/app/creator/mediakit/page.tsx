"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Download,
  Share2,
  Palette,
  Edit3,
  Eye,
  Plus,
  X,
  RefreshCw,
  Sparkles,
  ImageIcon,
  Type,
  Loader2,
  Upload,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstagramData } from "@/hooks/useInstagramData";
import {
  generateMediaKitHTML,
  defaultMediaKitConfig,
  MEDIAKIT_THEMES,
  type MediaKitConfig,
} from "@/lib/mediakit-generator";
import { loadBrandSettings } from "@/lib/brand-settings-store";
import { loadUserProfile, getDisplayName } from "@/lib/user-profile-store";
import { loadMediaKitConfig, saveMediaKitConfig } from "@/lib/mediakit-config-store";
import { AIFeedbackBar } from "@/components/ui/ai-feedback-bar";
import { useAnimatedStatus } from "@/hooks/useAnimatedStatus";
import { useT } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import { captureEvent } from "@/lib/posthog";

// ─── Google Fonts ─────────────────────────────────────────────────────────────

const GOOGLE_FONTS = [
  "Inter",
  "Roboto",
  "Montserrat",
  "Playfair Display",
  "Raleway",
  "Oswald",
  "Lora",
  "Nunito",
  "Poppins",
  "Bebas Neue",
  "Dancing Script",
  "Pacifico",
  "Merriweather",
  "Open Sans",
  "Source Sans 3",
];

// ─── Color picker with hex input ──────────────────────────────────────────────

function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full cursor-pointer rounded border border-border"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
        }}
        maxLength={7}
        className="w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

// ─── Theme list from generator (10 themes) ────────────────────────────────────

const THEME_LIST = Object.entries(MEDIAKIT_THEMES).map(([id, t]) => ({ id, ...t }));

// ─── Input component ──────────────────────────────────────────────────────────

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MediaKitPage() {
  const { data, isLoading } = useInstagramData();
  const t = useT();
  const { lang } = useLanguage();
  const MEDIAKIT_GEN_STATUSES = [
    t("mediakit.gen.status.analyzeNiche"),
    t("mediakit.gen.status.positioning"),
    t("mediakit.gen.status.tagline"),
    t("mediakit.gen.status.rate"),
    t("mediakit.gen.status.finalise"),
  ];
  const [aiModel, setAiModel] = useState("gemini-2.5-flash");
  const [targetBrand, setTargetBrand] = useState("");
  const [config, setConfig] = useState<MediaKitConfig>(() => loadMediaKitConfig());
  const [newService, setNewService] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [shareId] = useState(() => Math.random().toString(36).substring(2, 10));
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const generatingStatus = useAnimatedStatus(isGenerating, MEDIAKIT_GEN_STATUSES);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Initialise config from brand settings + user profile + real profile data
  useEffect(() => {
    const brand = loadBrandSettings();
    const userProfile = loadUserProfile();
    const displayName = getDisplayName(userProfile);
    setConfig((c) => ({
      ...c,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      accentColor: brand.accentColor,
      fontTitle: brand.fontTitle,
      fontBody: brand.fontBody,
      ...(userProfile.email && { contactEmail: userProfile.email }),
      ...(displayName && { displayName }),
      ...(userProfile.profilePhotoBase64 && { profilePicUrl: userProfile.profilePhotoBase64 }),
    }));
  }, []);

  useEffect(() => {
    if (data?.profile) {
      setConfig((c) => ({
        ...c,
        // Only pre-fill from profile if not already customised
        contactEmail:
          c.contactEmail ||
          (data.profile.website?.includes("@")
            ? data.profile.website
            : `contact@${data.profile.username}.com`),
        tagline:
          c.tagline !== defaultMediaKitConfig.tagline
            ? c.tagline
            : (data.profile.bio?.split("\n")[0] ?? c.tagline),
        profilePicUrl: c.profilePicUrl || data.profile.profilePicUrl,
        displayName: c.displayName || data.profile.fullName || data.profile.username,
      }));
    }
  }, [data?.profile]);

  // Auto-save config to localStorage on every change
  useEffect(() => {
    saveMediaKitConfig(config);
  }, [config]);

  const html = useMemo(() => {
    if (!data) return "";
    return generateMediaKitHTML(data, { ...config, lang });
  }, [data, config, lang]);

  // ── AI generation ─────────────────────────────────────────────────────────

  const generateWithAI = useCallback(
    async (feedback?: string) => {
      if (!data || isGenerating) return;
      setIsGenerating(true);
      try {
        const topContentType = data.metrics?.contentTypePerformance?.sort(
          (a, b) => (b.avgEngagement ?? 0) - (a.avgEngagement ?? 0)
        )[0]?.type;

        const topCountries = data.audienceInsights?.topCountries
          ? Object.keys(data.audienceInsights.topCountries).slice(0, 3)
          : [];

        const body = {
          username: data.profile.username ?? "",
          followerCount: data.profile.followerCount ?? 0,
          engagementRate: data.metrics?.engagementRate ?? 0,
          bio: data.profile.bio ?? "",
          contactEmail: config.contactEmail,
          topContentType,
          audienceGender: data.audienceInsights?.genderSplit
            ? {
                female: data.audienceInsights.genderSplit.female ?? 0,
                male: data.audienceInsights.genderSplit.male ?? 0,
              }
            : undefined,
          topCountries,
          posts: data.posts
            ?.filter((p) => p.caption.trim().length > 0)
            .slice(0, 10)
            .map((p) => ({ caption: p.caption })),
          feedback,
          model: aiModel,
          ...(targetBrand.trim() && {
            collabContext: `Adapt the tagline and services for a partnership pitch to ${targetBrand.trim()}`,
          }),
        };

        const res = await fetch("/api/mediakit/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setHasGenerated(true);
            setConfig((c) => ({
              ...c,
              tagline: json.tagline ?? c.tagline,
              services: json.services?.length ? json.services : c.services,
              ratePerPost: json.ratePerPost ?? c.ratePerPost,
            }));
          }
        }
      } catch (err) {
        console.error("AI generate error:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [data, config.contactEmail, isGenerating, aiModel, targetBrand]
  );

  const handleDownloadHTML = useCallback(() => {
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `media-kit-${data?.profile.username ?? "creator"}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [html, data]);

  const handlePrintPDF = useCallback(() => {
    captureEvent("mediakit_downloaded_pdf", { theme: config.theme });
    // Inject an auto-print script and open in a new tab so fonts load before printing
    const printHtml = html.replace(
      "</body>",
      "<script>window.addEventListener('load',()=>setTimeout(window.print,600))</script></body>"
    );
    const blob = new Blob([printHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 15_000);
  }, [html]);

  const handleShare = useCallback(() => {
    const shareUrl = `${window.location.origin}/mediakit/${shareId}`;
    navigator.clipboard.writeText(shareUrl);
  }, [shareId]);

  const updateConfig = useCallback(
    <K extends keyof MediaKitConfig>(key: K, value: MediaKitConfig[K]) => {
      setConfig((c) => ({ ...c, [key]: value }));
    },
    []
  );

  const addService = useCallback(() => {
    if (!newService.trim()) return;
    setConfig((c) => ({ ...c, services: [...c.services, newService.trim()] }));
    setNewService("");
  }, [newService]);

  const removeService = useCallback((i: number) => {
    setConfig((c) => ({ ...c, services: c.services.filter((_, idx) => idx !== i) }));
  }, []);

  const [newPartnership, setNewPartnership] = useState("");

  const addPartnership = useCallback(() => {
    if (!newPartnership.trim()) return;
    setConfig((c) => ({
      ...c,
      pastPartnerships: [...(c.pastPartnerships ?? []), newPartnership.trim()],
    }));
    setNewPartnership("");
  }, [newPartnership]);

  const removePartnership = useCallback((i: number) => {
    setConfig((c) => ({
      ...c,
      pastPartnerships: (c.pastPartnerships ?? []).filter((_, idx) => idx !== i),
    }));
  }, []);

  // ── Photo upload ──────────────────────────────────────────────────────────

  const handlePhotoUpload = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) updateConfig("profilePicUrl", dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [updateConfig]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header mode="creator" />
        <div className="mx-auto max-w-7xl space-y-4 p-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <Skeleton className="h-[600px] rounded-xl" />
            <Skeleton className="h-[600px] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Header mode="creator" />
        <p className="text-muted-foreground">{t("mediakit.noData")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data.profile} mode="creator" />

      <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
        {/* Title row */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="h-5 w-5 text-violet-400" />
              {t("mediakit.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("mediakit.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateWithAI()}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              )}
              {isGenerating ? generatingStatus : t("mediakit.ai.button")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5" />
              {t("mediakit.share")}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintPDF}>
              <RefreshCw className="h-3.5 w-3.5" />
              {t("mediakit.exportPDF")}
            </Button>
            <Button size="sm" onClick={handleDownloadHTML}>
              <Download className="h-3.5 w-3.5" />
              {t("mediakit.downloadHTML")}
            </Button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="mb-4 flex w-fit gap-1 rounded-lg bg-muted p-1 lg:hidden">
          <button
            onClick={() => setActiveTab("edit")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "edit" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            <Edit3 className="h-3.5 w-3.5" /> {t("mediakit.tab.edit")}
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "preview" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            <Eye className="h-3.5 w-3.5" /> {t("mediakit.tab.preview")}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* ── Editor sidebar ── */}
          <div className={`space-y-4 ${activeTab === "preview" ? "hidden lg:block" : ""}`}>
            {/* Model selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{t("model.selector.label")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["gemini-2.5-flash", t("model.flash25.label"), t("model.flash25.desc")],
                      ["gemini-2.5-pro", t("model.pro25.label"), t("model.pro25.desc")],
                    ] as const
                  ).map(([id, label, desc]) => (
                    <button
                      key={id}
                      onClick={() => setAiModel(id)}
                      title={desc}
                      className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                        aiModel === id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <span className="text-xs font-semibold">{label}</span>
                      <span className="text-[10px] leading-tight opacity-70">{desc}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Theme picker */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Palette className="h-4 w-4 text-violet-400" />
                  {t("mediakit.colors.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 10-theme swatches — 5 × 2 grid */}
                <div className="grid grid-cols-5 gap-2">
                  {THEME_LIST.map((th) => {
                    const isActive = config.theme === th.id;
                    return (
                      <button
                        key={th.id}
                        title={th.name}
                        onClick={() =>
                          setConfig((c) => ({
                            ...c,
                            theme: th.id,
                            primaryColor: th.primary,
                            secondaryColor: th.secondary,
                            accentColor: th.accent,
                          }))
                        }
                        className={`relative h-10 rounded-xl border-2 transition-all ${
                          isActive
                            ? "scale-110 border-white shadow-md"
                            : "border-transparent opacity-80 hover:opacity-100"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${th.primary}, ${th.secondary})`,
                        }}
                      >
                        {isActive && (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Theme name display */}
                {config.theme && (
                  <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                    {MEDIAKIT_THEMES[config.theme]?.name ?? config.theme}
                  </p>
                )}
                {/* Custom color overrides */}
                <div className="grid grid-cols-3 gap-2">
                  <ColorPickerField
                    label={t("mediakit.colors.primary")}
                    value={config.primaryColor}
                    onChange={(v) => updateConfig("primaryColor", v)}
                  />
                  <ColorPickerField
                    label={t("mediakit.colors.secondary")}
                    value={config.secondaryColor}
                    onChange={(v) => updateConfig("secondaryColor", v)}
                  />
                  <ColorPickerField
                    label={t("mediakit.colors.accent")}
                    value={config.accentColor}
                    onChange={(v) => updateConfig("accentColor", v)}
                  />
                </div>
                {/* Hero background */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Hero background
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        [
                          "gradient",
                          "Gradient",
                          `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})`,
                        ],
                        ["primary", "Primary", config.primaryColor],
                        ["secondary", "Secondary", config.secondaryColor],
                        ["accent", "Accent", config.accentColor],
                      ] as const
                    ).map(([val, label, bg]) => {
                      const isActive = (config.heroBg ?? "gradient") === val;
                      return (
                        <button
                          key={val}
                          title={label}
                          onClick={() => updateConfig("heroBg", val as MediaKitConfig["heroBg"])}
                          className={`relative h-9 rounded-xl border-2 transition-all ${isActive ? "scale-110 border-white shadow-md" : "border-transparent opacity-75 hover:opacity-100"}`}
                          style={{ background: bg }}
                        >
                          {isActive && (
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fonts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Type className="h-4 w-4 text-sky-400" />
                  {t("mediakit.fonts.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["fontTitle", t("mediakit.fonts.fontTitle"), config.fontTitle],
                      ["fontBody", t("mediakit.fonts.fontBody"), config.fontBody],
                    ] as const
                  ).map(([key, label, value]) => (
                    <div key={key}>
                      <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                        {label}
                      </label>
                      <select
                        value={value}
                        onChange={(e) => updateConfig(key, e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {GOOGLE_FONTS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Identity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Edit3 className="h-4 w-4 text-pink-400" />
                  {t("mediakit.identity.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Display name */}
                <LabeledInput
                  label={t("mediakit.identity.displayName")}
                  value={config.displayName ?? ""}
                  onChange={(v) => updateConfig("displayName", v)}
                  placeholder={data?.profile.fullName || data?.profile.username || ""}
                />
                {/* Profile photo */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    {t("mediakit.identity.profilePic")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e.target.files)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3" />
                      {t("mediakit.identity.uploadPhoto")}
                    </Button>
                    {config.profilePicUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={config.profilePicUrl}
                        alt={t("mediakit.identity.photoPreview")}
                        className="h-10 w-10 flex-shrink-0 rounded-full border border-border object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                  </div>
                </div>
                {/* Target brand for AI adaptation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Target brand{" "}
                    <span className="normal-case text-muted-foreground/60">
                      (optional — adapts AI content)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={targetBrand}
                    onChange={(e) => setTargetBrand(e.target.value)}
                    placeholder="e.g. Nike, Vogue, Air France…"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <LabeledInput
                  label={t("mediakit.identity.tagline")}
                  value={config.tagline}
                  onChange={(v) => updateConfig("tagline", v)}
                  placeholder={t("mediakit.identity.taglinePlaceholder")}
                />
                <LabeledInput
                  label={t("mediakit.identity.email")}
                  value={config.contactEmail}
                  onChange={(v) => updateConfig("contactEmail", v)}
                  placeholder={t("mediakit.identity.emailPlaceholder")}
                  type="email"
                />
                <LabeledInput
                  label={t("mediakit.identity.rate")}
                  value={config.ratePerPost ?? ""}
                  onChange={(v) => updateConfig("ratePerPost", v)}
                  placeholder={t("mediakit.identity.ratePlaceholder")}
                />
                {hasGenerated && (
                  <AIFeedbackBar
                    onRegenerate={generateWithAI}
                    isGenerating={isGenerating}
                    placeholder={t("mediakit.identity.feedbackPlaceholder")}
                  />
                )}
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  {t("mediakit.services.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {config.services.map((s, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {s}
                      <button
                        onClick={() => removeService(i)}
                        className="ml-0.5 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addService()}
                    placeholder={t("mediakit.services.addPlaceholder")}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button size="sm" onClick={addService}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            {/* Past Partnerships */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Partenariats passés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(config.pastPartnerships ?? []).map((p, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {p}
                      <button
                        onClick={() => removePartnership(i)}
                        className="ml-0.5 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPartnership}
                    onChange={(e) => setNewPartnership(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addPartnership()}
                    placeholder="ex: Nike, Le Monde, Air France…"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button size="sm" onClick={addPartnership}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Preview panel ── */}
          <div
            className={`overflow-hidden rounded-xl border border-border bg-black ${activeTab === "edit" ? "hidden lg:block" : ""}`}
            style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Eye className="h-3 w-3" />
                {t("mediakit.preview.label")}
              </span>
              <Badge variant="outline" className="text-[10px]">
                @{data.profile.username}
              </Badge>
            </div>
            {html ? (
              <iframe
                ref={iframeRef}
                srcDoc={html}
                className="h-full w-full border-0"
                title="Media Kit Preview"
                sandbox="allow-same-origin allow-scripts allow-popups"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {t("mediakit.preview.loading")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
