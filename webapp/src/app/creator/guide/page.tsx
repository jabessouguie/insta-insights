"use client";

import { useState, useRef, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { useInstagramData } from "@/hooks/useInstagramData";
import { useT } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import { captureEvent } from "@/lib/posthog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Upload, X, Sparkles, Loader2, Plus, FileText, Trash2 } from "lucide-react";
import { ModelSelector } from "@/components/creator/ModelSelector";
import { getModelPref, saveModelPref } from "@/lib/model-prefs-store";
import type { GuideType } from "@/types/instagram";
import type { GuideGenerateRequest } from "@/app/api/guide/generate/route";

export default function GuidePage() {
  const { data } = useInstagramData();
  const t = useT();
  const { lang } = useLanguage();

  // ── Guide config state ────────────────────────────────────────────────────
  const [guideTitle, setGuideTitle] = useState("");
  const [guideSubtitle, setGuideSubtitle] = useState("");
  const [guideType, setGuideType] = useState<GuideType>("general");
  const [authorName, setAuthorName] = useState(
    data?.profile?.username ? `@${data.profile.username}` : ""
  );
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [rawSections, setRawSections] = useState<string[]>(["", ""]);

  // ── Photos state ──────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const readers = Array.from(files)
      .slice(0, 8)
      .map(
        (file) =>
          new Promise<{ data: string; name: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ data: e.target!.result as string, name: file.name });
            reader.readAsDataURL(file);
          })
      );
    Promise.all(readers).then((results) => {
      setPhotos((prev) => [...prev, ...results.map((r) => r.data)].slice(0, 8));
      setPhotoNames((prev) => [...prev, ...results.map((r) => r.name)].slice(0, 8));
    });
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoNames((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Generation state ──────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [aiModel, setAiModel] = useState<string>(getModelPref("guide"));

  const GUIDE_TYPES: { value: GuideType; label: string }[] = [
    { value: "travel", label: t("guide.type.travel") },
    { value: "tutorial", label: t("guide.type.tutorial") },
    { value: "recipe", label: t("guide.type.recipe") },
    { value: "tips", label: t("guide.type.tips") },
    { value: "general", label: t("guide.type.general") },
  ];

  const handleGenerate = async () => {
    if (!guideTitle.trim()) {
      setError(t("guide.error.noTitle"));
      return;
    }
    const filled = rawSections.filter((s) => s.trim());
    if (filled.length === 0) {
      setError(t("guide.error.noSection"));
      return;
    }
    setError("");
    setIsGenerating(true);
    setGeneratedHtml(null);

    try {
      const body: GuideGenerateRequest = {
        rawSections: filled,
        photos,
        type: guideType,
        title: guideTitle,
        subtitle: guideSubtitle || undefined,
        authorName: authorName || undefined,
        accentColor,
        language: lang as "fr" | "en",
        model: aiModel,
      } as GuideGenerateRequest & { model?: string };

      const res = await fetch("/api/guide/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success && json.html) {
        setGeneratedHtml(json.html as string);
        captureEvent("guide_generated", {
          guideType,
          numSections: filled.length,
          hasPhotos: photos.length > 0,
        });
      } else {
        setError(json.error ?? "Erreur lors de la génération");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = () => {
    if (!generatedHtml) return;
    captureEvent("guide_exported_pdf", { guideType });
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="instagram-gradient flex h-10 w-10 items-center justify-center rounded-xl">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("guide.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("guide.subtitle")}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left column — config form */}
          <div className="space-y-5">
            {/* Guide type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">{t("guide.type.label")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {GUIDE_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGuideType(value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        guideType === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Title & meta */}
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("guide.title.label")} *
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder={t("guide.title.placeholder")}
                    value={guideTitle}
                    onChange={(e) => setGuideTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("guide.subtitle.label")}
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder={t("guide.subtitle.placeholder")}
                    value={guideSubtitle}
                    onChange={(e) => setGuideSubtitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("guide.author.label")}
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder={t("guide.author.placeholder")}
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("guide.color.label")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded border border-border bg-background p-0.5"
                    />
                    <span className="font-mono text-xs text-muted-foreground">{accentColor}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">{t("guide.sections.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rawSections.map((section, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">
                        {t("guide.sections.section")} {i + 1}
                      </Badge>
                      {rawSections.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setRawSections((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder={t("guide.sections.placeholder")}
                      value={section}
                      onChange={(e) => {
                        const updated = [...rawSections];
                        updated[i] = e.target.value;
                        setRawSections(updated);
                      }}
                    />
                  </div>
                ))}
                {rawSections.length < 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    onClick={() => setRawSections((prev) => [...prev, ""])}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("guide.sections.add")}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Photos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">{t("guide.photos.title")}</CardTitle>
                <CardDescription className="text-xs">
                  {t("guide.photos.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handlePhotoUpload(e.dataTransfer.files);
                  }}
                  className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <Upload className="h-5 w-5" />
                  <span>{t("guide.photos.dropzone")}</span>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {photos.map((src, i) => (
                      <div key={i} className="group relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={photoNames[i]}
                          className="h-14 w-14 rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generate button */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <ModelSelector
              feature="guide"
              value={aiModel}
              onChange={(m) => {
                setAiModel(m);
                saveModelPref("guide", m);
              }}
              className="mb-2"
            />

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="instagram-gradient w-full gap-2 text-white"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? t("guide.generating") : t("guide.generate")}
            </Button>
          </div>

          {/* Right column — preview */}
          <div className="space-y-4">
            {generatedHtml ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{guideTitle}</span>
                  </div>
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {t("guide.export")}
                  </Button>
                </div>
                <iframe
                  srcDoc={generatedHtml}
                  className="h-[700px] w-full rounded-lg border border-border bg-white"
                  title="Guide preview"
                  sandbox="allow-same-origin"
                />
              </>
            ) : (
              <div className="flex h-[500px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border text-muted-foreground">
                <BookOpen className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t("guide.preview.empty")}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
