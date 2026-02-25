"use client";

import { useState, useRef, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { useInstagramData } from "@/hooks/useInstagramData";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutPanelLeft,
  Upload,
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  CarouselGenerateRequest,
  CarouselGenerateResponse,
  CarouselSlideContent,
  CarouselFonts,
  CarouselAudience,
} from "@/types/instagram";

// ─── Canvas renderer ─────────────────────────────────────────────────────────

const SLIDE_SIZE = 1080; // Instagram square format

async function loadFont(family: string): Promise<void> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
    if (!document.querySelector(`link[href*="${encodeURIComponent(family)}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
    await document.fonts.ready;
  } catch {
    // Fall back to system fonts silently
  }
}

async function renderSlideToBlob(
  slide: CarouselSlideContent,
  photos: string[],
  fonts: CarouselFonts,
  primaryColor: string,
  accentColor: string,
  slideIndex: number,
  totalSlides: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SLIDE_SIZE;
  canvas.height = SLIDE_SIZE;
  const ctx = canvas.getContext("2d")!;

  // ── Background ───────────────────────────────────────────────────────────
  const photo = photos[slide.photoIndex] ?? photos[0] ?? null;
  if (photo) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Cover fit
        const scale = Math.max(SLIDE_SIZE / img.width, SLIDE_SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (SLIDE_SIZE - w) / 2, (SLIDE_SIZE - h) / 2, w, h);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = photo;
    });
  } else {
    // Gradient background using brand colors
    const grad = ctx.createLinearGradient(0, 0, SLIDE_SIZE, SLIDE_SIZE);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(1, accentColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SLIDE_SIZE, SLIDE_SIZE);
  }

  // ── Dark overlay (bottom 60%) ────────────────────────────────────────────
  const overlayGrad = ctx.createLinearGradient(0, SLIDE_SIZE * 0.3, 0, SLIDE_SIZE);
  overlayGrad.addColorStop(0, "rgba(0,0,0,0)");
  overlayGrad.addColorStop(0.4, "rgba(0,0,0,0.55)");
  overlayGrad.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, SLIDE_SIZE, SLIDE_SIZE);

  // ── Accent bar (left side) ───────────────────────────────────────────────
  ctx.fillStyle = accentColor;
  ctx.fillRect(60, SLIDE_SIZE * 0.55, 6, SLIDE_SIZE * 0.38);

  // ── Slide counter (top-right) ────────────────────────────────────────────
  ctx.font = `bold 32px ${fonts.body}`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "right";
  ctx.fillText(`${slideIndex + 1} / ${totalSlides}`, SLIDE_SIZE - 60, 80);

  const textX = 90;
  let textY = SLIDE_SIZE * 0.6;

  // ── Title ────────────────────────────────────────────────────────────────
  ctx.textAlign = "left";
  ctx.font = `bold 72px "${fonts.title}"`;
  ctx.fillStyle = "#ffffff";
  // Word-wrap title
  const titleLines = wrapText(ctx, slide.title, SLIDE_SIZE - textX - 60, 72);
  for (const line of titleLines) {
    ctx.fillText(line, textX, textY);
    textY += 84;
  }

  // ── Subtitle ─────────────────────────────────────────────────────────────
  textY += 12;
  ctx.font = `500 44px "${fonts.subtitle}"`;
  ctx.fillStyle = accentColor;
  const subLines = wrapText(ctx, slide.subtitle, SLIDE_SIZE - textX - 60, 44);
  for (const line of subLines) {
    ctx.fillText(line, textX, textY);
    textY += 54;
  }

  // ── Body ─────────────────────────────────────────────────────────────────
  if (slide.body) {
    textY += 16;
    ctx.font = `400 36px "${fonts.body}"`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const bodyLines = wrapText(ctx, slide.body, SLIDE_SIZE - textX - 60, 36);
    for (const line of bodyLines) {
      if (textY < SLIDE_SIZE - 80) {
        ctx.fillText(line, textX, textY);
        textY += 46;
      }
    }
  }

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  const maxLines = Math.floor((SLIDE_SIZE * 0.35) / (fontSize * 1.2));

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── Google Fonts list (curated) ─────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function CarouselPage() {
  const { data } = useInstagramData();
  const t = useT();

  // Form state
  const [subject, setSubject] = useState("");
  const [audience, setAudience] = useState<CarouselAudience>({
    gender: "all",
    region: "France",
    interests: "",
  });
  const [fonts, setFonts] = useState<CarouselFonts>({
    title: "Playfair Display",
    subtitle: "Montserrat",
    body: "Inter",
  });
  const [primaryColor, setPrimaryColor] = useState("#1a1a2e");
  const [accentColor, setAccentColor] = useState("#e91e8c");
  const [numSlides, setNumSlides] = useState(6);
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const [photos, setPhotos] = useState<string[]>([]); // base64
  const [photoNames, setPhotoNames] = useState<string[]>([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CarouselGenerateResponse | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewBlobs, setPreviewBlobs] = useState<string[]>([]); // object URLs
  const [isRendering, setIsRendering] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handlePhotoUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const readers = Array.from(files)
      .slice(0, 10)
      .map(
        (file) =>
          new Promise<{ data: string; name: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ data: e.target!.result as string, name: file.name });
            reader.readAsDataURL(file);
          })
      );
    Promise.all(readers).then((results) => {
      setPhotos((prev) => [...prev, ...results.map((r) => r.data)].slice(0, 10));
      setPhotoNames((prev) => [...prev, ...results.map((r) => r.name)].slice(0, 10));
    });
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoNames((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!subject.trim()) return;
    setIsGenerating(true);
    setResult(null);
    setPreviewBlobs([]);
    setPreviewIndex(0);

    const previousCaptions =
      data?.posts
        ?.filter((p) => p.mediaType !== "STORY" && p.caption.trim().length > 0)
        .slice(-15)
        .map((p) => p.caption) ?? [];

    const req: CarouselGenerateRequest = {
      subject,
      audience,
      fonts,
      primaryColor,
      accentColor,
      numSlides,
      photos,
      previousCaptions,
      language,
    };

    try {
      const res = await fetch("/api/carousel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const json: CarouselGenerateResponse = await res.json();
      setResult(json);

      if (json.success && json.slides) {
        // Render slides to canvas
        setIsRendering(true);
        await loadFont(fonts.title);
        await loadFont(fonts.subtitle);
        await loadFont(fonts.body);

        const blobs: string[] = [];
        for (const [i, slide] of json.slides.entries()) {
          const blob = await renderSlideToBlob(
            slide,
            photos,
            fonts,
            primaryColor,
            accentColor,
            i,
            json.slides.length
          );
          blobs.push(URL.createObjectURL(blob));
        }
        setPreviewBlobs(blobs);
        setIsRendering(false);
      }
    } catch (err) {
      console.error(err);
      setResult({ success: false, error: "Erreur réseau" });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const downloadSlide = (index: number) => {
    const url = previewBlobs[index];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `carousel-slide-${index + 1}.png`;
    a.click();
  };

  const downloadAll = () => {
    previewBlobs.forEach((_, i) => {
      setTimeout(() => downloadSlide(i), i * 300);
    });
  };

  const copyDescription = () => {
    if (!result?.instagramDescription) return;
    const text = [result.instagramDescription, "", result.hashtags?.join(" ") ?? ""]
      .join("\n")
      .trim();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <LayoutPanelLeft className="h-6 w-6 text-violet-400" />
            Générateur de Carrousel
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crée un carrousel Instagram captivant à partir de tes photos et d&apos;un sujet. Gemini
            analyse ton style pour rester fidèle à ton esthétique.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* ── Left: Form ── */}
          <div className="space-y-6">
            {/* Subject */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">1. Sujet du carrousel</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: 5 erreurs qui empêchent ta croissance sur Instagram"
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-xs text-muted-foreground">Nombre de slides :</label>
                  {[3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumSlides(n)}
                      className={`h-7 w-7 rounded-md text-xs font-semibold transition-colors ${
                        numSlides === n
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-xs text-muted-foreground">Langue des slides :</label>
                  {(["en", "fr"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${
                        language === lang
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {lang === "en" ? "🇬🇧 English" : "🇫🇷 Français"}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Photos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">2. Photos</CardTitle>
                <CardDescription>Jusqu&apos;à 10 photos · formats JPG, PNG, WebP</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handlePhotoUpload(e.dataTransfer.files);
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <Upload className="h-6 w-6" />
                  <span>Clique ou glisse tes photos ici</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />

                {/* Thumbnails */}
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {photos.map((src, i) => (
                      <div key={i} className="group relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={photoNames[i]}
                          className="h-16 w-16 rounded-md object-cover"
                        />
                        <button
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

            {/* Audience */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">3. Audience cible</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Genre</label>
                    <select
                      value={audience.gender}
                      onChange={(e) =>
                        setAudience((a) => ({
                          ...a,
                          gender: e.target.value as CarouselAudience["gender"],
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="all">Tous</option>
                      <option value="female">Femmes</option>
                      <option value="male">Hommes</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Région</label>
                    <input
                      type="text"
                      value={audience.region}
                      onChange={(e) => setAudience((a) => ({ ...a, region: e.target.value }))}
                      placeholder="France, Afrique, Monde…"
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Centres d&apos;intérêt (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={audience.interests}
                    onChange={(e) => setAudience((a) => ({ ...a, interests: e.target.value }))}
                    placeholder="fitness, lifestyle, entrepreneuriat…"
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Graphic charter */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">4. Charte graphique</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fonts */}
                <div className="grid grid-cols-3 gap-3">
                  {(["title", "subtitle", "body"] as const).map((role) => (
                    <div key={role}>
                      <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                        {role === "title" ? "Titre" : role === "subtitle" ? "Sous-titre" : "Corps"}
                      </label>
                      <select
                        value={fonts[role]}
                        onChange={(e) => setFonts((f) => ({ ...f, [role]: e.target.value }))}
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

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["primaryColor", "Fond / Dégradé", primaryColor, setPrimaryColor],
                      ["accentColor", "Couleur accent", accentColor, setAccentColor],
                    ] as const
                  ).map(([, label, value, setter]) => (
                    <div key={label}>
                      <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                        {label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          className="h-8 w-14 cursor-pointer rounded border border-border"
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => {
                            if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setter(e.target.value);
                          }}
                          maxLength={7}
                          className="w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !subject.trim()}
              size="lg"
              className="instagram-gradient w-full gap-2 text-white"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Générer le carrousel
                </>
              )}
            </Button>
          </div>

          {/* ── Right: Preview ── */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Aperçu du carrousel</CardTitle>
                {result?.slides && (
                  <CardDescription>
                    {previewBlobs.length} / {result.slides.length} slides rendues
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Slide preview */}
                <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  {isGenerating || isRendering ? (
                    <Skeleton className="h-full w-full" />
                  ) : previewBlobs.length > 0 ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewBlobs[previewIndex]}
                        alt={`Slide ${previewIndex + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {/* Navigation arrows */}
                      {previewBlobs.length > 1 && (
                        <>
                          <button
                            onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                            disabled={previewIndex === 0}
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-30"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setPreviewIndex((i) => Math.min(previewBlobs.length - 1, i + 1))
                            }
                            disabled={previewIndex === previewBlobs.length - 1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-30"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          {/* Dots */}
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                            {previewBlobs.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setPreviewIndex(i)}
                                className={`h-1.5 rounded-full transition-all ${
                                  i === previewIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <LayoutPanelLeft className="h-10 w-10 opacity-30" />
                      <p className="text-xs">L&apos;aperçu apparaîtra ici</p>
                    </div>
                  )}
                </div>

                {/* Download buttons */}
                {previewBlobs.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => downloadSlide(previewIndex)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Slide {previewIndex + 1}
                    </Button>
                    <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={downloadAll}>
                      <Download className="h-3.5 w-3.5" />
                      Tout télécharger
                    </Button>
                  </div>
                )}

                {/* Instagram description */}
                {result?.instagramDescription && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Description Instagram
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={copyDescription}
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            {t("common.copied")}
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            {t("common.copy")}
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-foreground/80">
                      {result.instagramDescription}
                    </div>

                    {/* Hashtags */}
                    {result.hashtags && result.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.hashtags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {result && !result.success && (
                  <p className="text-xs text-destructive">
                    {result.error ?? "Une erreur est survenue"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
