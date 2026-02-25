"use client";

import { useState, useCallback, useMemo, useRef } from "react";
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
  type MediaKitConfig,
} from "@/lib/mediakit-generator";

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
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-border"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          maxLength={7}
          className="w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}

// ─── Color presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { name: "Violet & Rose", primary: "#7c3aed", secondary: "#db2777", accent: "#f59e0b" },
  { name: "Instagram", primary: "#833ab4", secondary: "#fd1d1d", accent: "#fcb045" },
  { name: "Océan", primary: "#0ea5e9", secondary: "#06b6d4", accent: "#10b981" },
  { name: "Emeraude", primary: "#059669", secondary: "#10b981", accent: "#f59e0b" },
  { name: "Feu", primary: "#f97316", secondary: "#dc2626", accent: "#fbbf24" },
  { name: "Minuit", primary: "#6366f1", secondary: "#8b5cf6", accent: "#a78bfa" },
];

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
  const [config, setConfig] = useState<MediaKitConfig>(defaultMediaKitConfig);
  const [newService, setNewService] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [shareId] = useState(() => Math.random().toString(36).substring(2, 10));
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialise config from real data when loaded
  useState(() => {
    if (data?.profile) {
      setConfig((c) => ({
        ...c,
        contactEmail: data.profile.website?.includes("@")
          ? data.profile.website
          : `contact@${data.profile.username}.com`,
        tagline: data.profile.bio?.split("\n")[0] ?? c.tagline,
        profilePicUrl: data.profile.profilePicUrl ?? c.profilePicUrl,
      }));
    }
  });

  const html = useMemo(() => {
    if (!data) return "";
    return generateMediaKitHTML(data, config);
  }, [data, config]);

  const handleDownloadHTML = useCallback(() => {
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `media-kit-${data?.profile.username ?? "creator"}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [html, data]);

  const handlePrintPDF = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  }, []);

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
        <p className="text-muted-foreground">Aucune donnée Instagram disponible.</p>
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
              Générateur de Media Kit
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Personnalise et exporte ton media kit professionnel
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5" />
              Copier lien de partage
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintPDF}>
              <RefreshCw className="h-3.5 w-3.5" />
              Exporter PDF
            </Button>
            <Button size="sm" onClick={handleDownloadHTML}>
              <Download className="h-3.5 w-3.5" />
              Télécharger HTML
            </Button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="mb-4 flex w-fit gap-1 rounded-lg bg-muted p-1 lg:hidden">
          <button
            onClick={() => setActiveTab("edit")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "edit" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            <Edit3 className="h-3.5 w-3.5" /> Éditer
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "preview" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            <Eye className="h-3.5 w-3.5" /> Aperçu
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* ── Editor sidebar ── */}
          <div className={`space-y-4 ${activeTab === "preview" ? "hidden lg:block" : ""}`}>
            {/* Color presets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Palette className="h-4 w-4 text-violet-400" />
                  Palette de couleurs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      title={p.name}
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          primaryColor: p.primary,
                          secondaryColor: p.secondary,
                          accentColor: p.accent,
                        }))
                      }
                      className={`h-10 rounded-lg border-2 transition-all ${config.primaryColor === p.primary ? "scale-105 border-foreground" : "border-transparent"}`}
                      style={{
                        background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})`,
                      }}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <ColorPickerField
                    label="Primaire"
                    value={config.primaryColor}
                    onChange={(v) => updateConfig("primaryColor", v)}
                  />
                  <ColorPickerField
                    label="Secondaire"
                    value={config.secondaryColor}
                    onChange={(v) => updateConfig("secondaryColor", v)}
                  />
                  <ColorPickerField
                    label="Accent"
                    value={config.accentColor}
                    onChange={(v) => updateConfig("accentColor", v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Identity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Edit3 className="h-4 w-4 text-pink-400" />
                  Identité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    Photo de profil (URL)
                  </label>
                  <input
                    type="url"
                    value={config.profilePicUrl ?? ""}
                    onChange={(e) => updateConfig("profilePicUrl", e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {config.profilePicUrl && (
                    <img
                      src={config.profilePicUrl}
                      alt="Aperçu"
                      className="h-12 w-12 rounded-full border border-border object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                </div>
                <LabeledInput
                  label="Tagline"
                  value={config.tagline}
                  onChange={(v) => updateConfig("tagline", v)}
                  placeholder="Créateur de contenu passionné..."
                />
                <LabeledInput
                  label="Email de contact"
                  value={config.contactEmail}
                  onChange={(v) => updateConfig("contactEmail", v)}
                  placeholder="contact@monsite.com"
                  type="email"
                />
                <LabeledInput
                  label="Tarif indicatif (ex: 500€)"
                  value={config.ratePerPost ?? ""}
                  onChange={(v) => updateConfig("ratePerPost", v)}
                  placeholder="500€"
                />
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Services proposés</CardTitle>
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
                    placeholder="Ajouter un service..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button size="sm" onClick={addService}>
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
                Aperçu live
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
                Chargement du preview...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
