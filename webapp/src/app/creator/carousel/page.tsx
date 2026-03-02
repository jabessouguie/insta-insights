"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
import { ScheduleModal } from "@/components/calendar/ScheduleModal";
import { saveItem } from "@/lib/calendar-store";
import { computeOptimalSlots } from "@/lib/slot-analyzer";
import type {
  CarouselGenerateRequest,
  CarouselGenerateResponse,
  CarouselSlideContent,
  CarouselFonts,
  CarouselAudience,
  ReelGenerateResponse,
  ReelAudioResponse,
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
  _slideIndex: number,
  _totalSlides: number
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

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      "image/png"
    )
  );
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

// ─── Story canvas renderer (1080 × 1920, vertical 9:16) ──────────────────────

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

async function renderStoryToBlob(
  slide: CarouselSlideContent,
  photos: string[],
  fonts: CarouselFonts,
  primaryColor: string,
  accentColor: string,
  _slideIndex: number,
  _totalSlides: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // ── Background ───────────────────────────────────────────────────────────
  const photo = photos[slide.photoIndex] ?? photos[0] ?? null;
  if (photo) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(STORY_WIDTH / img.width, STORY_HEIGHT / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (STORY_WIDTH - w) / 2, (STORY_HEIGHT - h) / 2, w, h);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = photo;
    });
  } else {
    const grad = ctx.createLinearGradient(0, 0, STORY_WIDTH, STORY_HEIGHT);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(1, accentColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  }

  // ── Dark overlay (bottom 50%) ────────────────────────────────────────────
  const overlayGrad = ctx.createLinearGradient(0, STORY_HEIGHT * 0.4, 0, STORY_HEIGHT);
  overlayGrad.addColorStop(0, "rgba(0,0,0,0)");
  overlayGrad.addColorStop(0.4, "rgba(0,0,0,0.55)");
  overlayGrad.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  // ── Bottom accent line ────────────────────────────────────────────────────
  ctx.fillStyle = accentColor;
  ctx.fillRect(STORY_WIDTH * 0.1, STORY_HEIGHT - 80, STORY_WIDTH * 0.8, 6);

  const textX = STORY_WIDTH / 2;
  let textY = STORY_HEIGHT * 0.62;

  // ── Title ────────────────────────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.font = `bold 100px "${fonts.title}"`;
  ctx.fillStyle = "#ffffff";
  const titleLines = wrapTextCentered(ctx, slide.title, STORY_WIDTH - 160, 100);
  for (const line of titleLines) {
    ctx.fillText(line, textX, textY);
    textY += 118;
  }

  // ── Body ─────────────────────────────────────────────────────────────────
  if (slide.body) {
    textY += 24;
    ctx.font = `400 52px "${fonts.body}"`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const bodyLines = wrapTextCentered(ctx, slide.body, STORY_WIDTH - 160, 52);
    for (const line of bodyLines) {
      if (textY < STORY_HEIGHT - 140) {
        ctx.fillText(line, textX, textY);
        textY += 66;
      }
    }
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      "image/png"
    )
  );
}

function wrapTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  _fontSize: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  const maxLines = 4;

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

  // Format switcher
  const [activeFormat, setActiveFormat] = useState<"carousel" | "stories" | "reels">("carousel");

  // Model selector
  const [aiModel, setAiModel] = useState("gemini-2.5-flash");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CarouselGenerateResponse | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewBlobs, setPreviewBlobs] = useState<string[]>([]); // object URLs
  const [isRendering, setIsRendering] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  // Reels state
  const [reelPrompt, setReelPrompt] = useState("");
  const [reelClips, setReelClips] = useState<string[]>([]); // base64 video data URLs
  const [reelClipNames, setReelClipNames] = useState<string[]>([]);
  const [reelDuration, setReelDuration] = useState(8);
  const [reelModel] = useState("veo-3.0-generate-001");
  const [isGeneratingReel, setIsGeneratingReel] = useState(false);
  const [reelResult, setReelResult] = useState<ReelGenerateResponse | null>(null);
  // Blob URL derived from reelResult.video — more reliable for <video> playback and <a> download
  const [reelBlobUrl, setReelBlobUrl] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Lyria audio state
  const [audioPrompt, setAudioPrompt] = useState("");
  const [audioBpm, setAudioBpm] = useState(120);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioResult, setAudioResult] = useState<ReelAudioResponse | null>(null);

  // ── Convert reel data URL → blob URL (more reliable for <video> playback and download) ───
  useEffect(() => {
    let objectUrl: string | null = null;
    if (reelResult?.video) {
      if (reelResult.video.startsWith("data:")) {
        fetch(reelResult.video)
          .then((r) => r.blob())
          .then((blob) => {
            objectUrl = URL.createObjectURL(blob);
            setReelBlobUrl(objectUrl);
          })
          .catch(() => {
            // Fallback: use data URL directly
            setReelBlobUrl(reelResult.video!);
          });
      } else {
        // Already a URI (gs:// or https://), use as-is
        setReelBlobUrl(reelResult.video);
      }
    } else {
      setReelBlobUrl(null);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reelResult]);

  // ── Persistent visual identity (localStorage) ───────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("insta-visual-identity");
      if (saved) {
        const vi = JSON.parse(saved);
        if (vi.fonts) setFonts(vi.fonts);
        if (vi.primaryColor) setPrimaryColor(vi.primaryColor);
        if (vi.accentColor) setAccentColor(vi.accentColor);
      }
    } catch {
      // ignore corrupt localStorage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "insta-visual-identity",
        JSON.stringify({ fonts, primaryColor, accentColor })
      );
    } catch {
      // quota exceeded, ignore
    }
  }, [fonts, primaryColor, accentColor]);

  // Stories state (reuses photos/fonts/colors/aiModel from carousel form)
  const [storySubject, setStorySubject] = useState("");
  const [storyNumSlides, setStoryNumSlides] = useState(5);
  const [storyLanguage, setStoryLanguage] = useState<"en" | "fr">("en");
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [storyResult, setStoryResult] = useState<CarouselGenerateResponse | null>(null);
  const [storyPreviewBlobs, setStoryPreviewBlobs] = useState<string[]>([]);
  const [storyPreviewIndex, setStoryPreviewIndex] = useState(0);
  const [isRenderingStory, setIsRenderingStory] = useState(false);
  const [storyCopied, setStoryCopied] = useState(false);

  // ── Calendar scheduling ───────────────────────────────────────────────────
  const calendarSlots = useMemo(
    () => (data?.metrics ? computeOptimalSlots(data.metrics) : []),
    [data?.metrics]
  );
  const [showCarouselSchedule, setShowCarouselSchedule] = useState(false);
  const [showStorySchedule, setShowStorySchedule] = useState(false);
  const [showReelSchedule, setShowReelSchedule] = useState(false);

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
      model: aiModel,
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
      setResult({ success: false, error: t("carousel.error.network") });
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

  // ── Stories generate ──────────────────────────────────────────────────────
  const handleGenerateStory = async () => {
    if (!storySubject.trim()) return;
    setIsGeneratingStory(true);
    setStoryResult(null);
    setStoryPreviewBlobs([]);
    setStoryPreviewIndex(0);

    const previousCaptions =
      data?.posts
        ?.filter((p) => p.mediaType !== "STORY" && p.caption.trim().length > 0)
        .slice(-15)
        .map((p) => p.caption) ?? [];

    const req: CarouselGenerateRequest = {
      subject: storySubject,
      audience,
      fonts,
      primaryColor,
      accentColor,
      numSlides: storyNumSlides,
      photos,
      previousCaptions,
      language: storyLanguage,
      model: aiModel,
    };

    try {
      const res = await fetch("/api/stories/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const json: CarouselGenerateResponse = await res.json();
      setStoryResult(json);

      if (json.success && json.slides) {
        setIsRenderingStory(true);
        await loadFont(fonts.title);
        await loadFont(fonts.body);

        const blobs: string[] = [];
        for (const [i, slide] of json.slides.entries()) {
          const blob = await renderStoryToBlob(
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
        setStoryPreviewBlobs(blobs);
        setIsRenderingStory(false);
      }
    } catch (err) {
      console.error(err);
      setStoryResult({ success: false, error: t("stories.error.network") });
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const downloadStorySlide = (index: number) => {
    const url = storyPreviewBlobs[index];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `story-slide-${index + 1}.png`;
    a.click();
  };

  const downloadAllStories = () => {
    storyPreviewBlobs.forEach((_, i) => {
      setTimeout(() => downloadStorySlide(i), i * 300);
    });
  };

  const copyStoryDescription = () => {
    if (!storyResult?.instagramDescription) return;
    const text = [storyResult.instagramDescription, "", storyResult.hashtags?.join(" ") ?? ""]
      .join("\n")
      .trim();
    navigator.clipboard.writeText(text).then(() => {
      setStoryCopied(true);
      setTimeout(() => setStoryCopied(false), 2000);
    });
  };

  // ── Reels handlers ────────────────────────────────────────────────────────
  const handleVideoUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const readers = Array.from(files)
      .slice(0, 3)
      .map(
        (file) =>
          new Promise<{ data: string; name: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ data: e.target!.result as string, name: file.name });
            reader.readAsDataURL(file);
          })
      );
    Promise.all(readers).then((results) => {
      setReelClips((prev) => [...prev, ...results.map((r) => r.data)].slice(0, 3));
      setReelClipNames((prev) => [...prev, ...results.map((r) => r.name)].slice(0, 3));
    });
  }, []);

  const handleGenerateReel = async () => {
    if (!reelPrompt.trim()) return;
    setIsGeneratingReel(true);
    setReelResult(null);
    try {
      const res = await fetch("/api/reels/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: reelPrompt,
          videoClips: reelClips,
          durationSeconds: reelDuration,
          model: reelModel,
          audience,
          brandColors: { primary: primaryColor, accent: accentColor },
          brandFonts: { title: fonts.title, body: fonts.body },
        }),
      });
      const json: ReelGenerateResponse = await res.json();
      setReelResult(json);
    } catch (err) {
      console.error(err);
      setReelResult({ success: false, error: t("reels.error.generic") });
    } finally {
      setIsGeneratingReel(false);
    }
  };

  // ── Lyria audio generation ────────────────────────────────────────────────
  const handleGenerateAudio = async () => {
    if (!audioPrompt.trim()) return;
    setIsGeneratingAudio(true);
    setAudioResult(null);
    try {
      const res = await fetch("/api/reels/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musicPrompt: audioPrompt,
          durationSeconds: reelDuration,
          bpm: audioBpm,
        }),
      });
      const json: ReelAudioResponse = await res.json();
      setAudioResult(json);
    } catch (err) {
      console.error(err);
      setAudioResult({ success: false, error: t("reels.error.generic") });
    } finally {
      setIsGeneratingAudio(false);
    }
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
            {t("carousel.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("carousel.subtitle")}</p>
        </div>
        {/* ── Format switcher ── */}
        <div className="mb-6 flex w-fit gap-1 rounded-lg bg-muted p-1">
          {(["carousel", "stories", "reels"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setActiveFormat(fmt)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeFormat === fmt
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`format.${fmt}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
        {/* ── Carousel format ── */}
        {activeFormat === "carousel" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            {/* ── Left: Form ── */}
            <div className="space-y-6">
              {/* Subject */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("carousel.subject.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t("carousel.subject.placeholder")}
                    rows={3}
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-xs text-muted-foreground">
                      {t("carousel.subject.slideCount")}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={numSlides}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) setNumSlides(Math.min(20, Math.max(1, v)));
                      }}
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-xs text-muted-foreground">/20</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-xs text-muted-foreground">
                      {t("carousel.subject.language")}
                    </label>
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
                  <CardTitle className="text-sm font-semibold">
                    {t("carousel.photos.title")}
                  </CardTitle>
                  <CardDescription>{t("carousel.photos.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Drop zone */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handlePhotoUpload(e.dataTransfer.files);
                    }}
                    className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Upload className="h-6 w-6" />
                    <span>{t("carousel.photos.dropzone")}</span>
                  </button>
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
                  <CardTitle className="text-sm font-semibold">
                    {t("carousel.audience.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        {t("carousel.audience.gender")}
                      </label>
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
                        <option value="all">{t("carousel.audience.genderAll")}</option>
                        <option value="female">{t("carousel.audience.genderFemale")}</option>
                        <option value="male">{t("carousel.audience.genderMale")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        {t("carousel.audience.ageRange")}
                      </label>
                      <select
                        value={audience.ageRange ?? "all"}
                        onChange={(e) => setAudience((a) => ({ ...a, ageRange: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="all">{t("carousel.audience.ageAll")}</option>
                        <option value="13-17">13–17</option>
                        <option value="18-24">18–24</option>
                        <option value="25-34">25–34</option>
                        <option value="35-44">35–44</option>
                        <option value="45-54">45–54</option>
                        <option value="55+">55+</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t("carousel.audience.region")}
                    </label>
                    <input
                      type="text"
                      value={audience.region}
                      onChange={(e) => setAudience((a) => ({ ...a, region: e.target.value }))}
                      placeholder={t("carousel.audience.regionPlaceholder")}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t("carousel.audience.interests")}
                    </label>
                    <input
                      type="text"
                      value={audience.interests}
                      onChange={(e) => setAudience((a) => ({ ...a, interests: e.target.value }))}
                      placeholder={t("carousel.audience.interestsPlaceholder")}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Graphic charter */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("carousel.design.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Fonts */}
                  <div className="grid grid-cols-3 gap-3">
                    {(["title", "subtitle", "body"] as const).map((role) => (
                      <div key={role}>
                        <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                          {role === "title"
                            ? t("carousel.design.fontTitle")
                            : role === "subtitle"
                              ? t("carousel.design.fontSubtitle")
                              : t("carousel.design.fontBody")}
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
                        [
                          "primaryColor",
                          t("carousel.design.background"),
                          primaryColor,
                          setPrimaryColor,
                        ],
                        ["accentColor", t("carousel.design.accent"), accentColor, setAccentColor],
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
                              if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))
                                setter(e.target.value);
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

              {/* Model selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("model.selector.label")}
                  </CardTitle>
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
                    {t("carousel.button.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t("carousel.button.generate")}
                  </>
                )}
              </Button>
            </div>

            {/* ── Right: Preview ── */}
            <div className="space-y-4">
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    {t("carousel.preview.title")}
                  </CardTitle>
                  {result?.slides && (
                    <CardDescription>
                      {previewBlobs.length} / {result.slides.length}{" "}
                      {t("carousel.preview.slidesRendered")}
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
                        <p className="text-xs">{t("carousel.preview.empty")}</p>
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
                        {t("carousel.download.slide")} {previewIndex + 1}
                      </Button>
                      <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={downloadAll}>
                        <Download className="h-3.5 w-3.5" />
                        {t("carousel.download.all")}
                      </Button>
                    </div>
                  )}

                  {/* Instagram description */}
                  {result?.instagramDescription && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("carousel.description.label")}
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

                  {/* Schedule CTA */}
                  {result?.success && previewBlobs.length > 0 && !showCarouselSchedule && (
                    <button
                      onClick={() => setShowCarouselSchedule(true)}
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 py-2 text-xs text-primary transition-colors hover:bg-primary/5"
                    >
                      📅 {t("calendar.schedule.cta")}
                    </button>
                  )}

                  {/* Error */}
                  {result && !result.success && (
                    <p className="text-xs text-destructive">
                      {result.error ?? t("carousel.error.generic")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}{" "}
        {/* end activeFormat === "carousel" */}
        {/* ── Stories format ── */}
        {activeFormat === "stories" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            {/* ── Left: Stories form ── */}
            <div className="space-y-6">
              {/* Subject */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("stories.subject.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={storySubject}
                    onChange={(e) => setStorySubject(e.target.value)}
                    placeholder={t("stories.subject.placeholder")}
                    rows={3}
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-xs text-muted-foreground">
                      {t("stories.subject.slideCount")}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={storyNumSlides}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) setStoryNumSlides(Math.min(20, Math.max(1, v)));
                      }}
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-xs text-muted-foreground">/20</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-xs text-muted-foreground">
                      {t("stories.subject.language")}
                    </label>
                    {(["en", "fr"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setStoryLanguage(lang)}
                        className={`rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${
                          storyLanguage === lang
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

              {/* Photos — separate input for stories tab */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("carousel.photos.title")}
                  </CardTitle>
                  <CardDescription>{t("carousel.photos.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    type="button"
                    onClick={() => storyFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handlePhotoUpload(e.dataTransfer.files);
                    }}
                    className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Upload className="h-6 w-6" />
                    <span>{t("carousel.photos.dropzone")}</span>
                  </button>
                  <input
                    ref={storyFileInputRef}
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

              {/* Audience — reused */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("carousel.audience.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        {t("carousel.audience.gender")}
                      </label>
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
                        <option value="all">{t("carousel.audience.genderAll")}</option>
                        <option value="female">{t("carousel.audience.genderFemale")}</option>
                        <option value="male">{t("carousel.audience.genderMale")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        {t("carousel.audience.ageRange")}
                      </label>
                      <select
                        value={audience.ageRange ?? "all"}
                        onChange={(e) => setAudience((a) => ({ ...a, ageRange: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="all">{t("carousel.audience.ageAll")}</option>
                        <option value="13-17">13–17</option>
                        <option value="18-24">18–24</option>
                        <option value="25-34">25–34</option>
                        <option value="35-44">35–44</option>
                        <option value="45-54">45–54</option>
                        <option value="55+">55+</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t("carousel.audience.region")}
                    </label>
                    <input
                      type="text"
                      value={audience.region}
                      onChange={(e) => setAudience((a) => ({ ...a, region: e.target.value }))}
                      placeholder={t("carousel.audience.regionPlaceholder")}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t("carousel.audience.interests")}
                    </label>
                    <input
                      type="text"
                      value={audience.interests}
                      onChange={(e) => setAudience((a) => ({ ...a, interests: e.target.value }))}
                      placeholder={t("carousel.audience.interestsPlaceholder")}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Design (fonts + colors) — reused */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("carousel.design.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {(["title", "body"] as const).map((role) => (
                      <div key={role}>
                        <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                          {role === "title"
                            ? t("carousel.design.fontTitle")
                            : t("carousel.design.fontBody")}
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
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        [
                          "primaryColor",
                          t("carousel.design.background"),
                          primaryColor,
                          setPrimaryColor,
                        ],
                        ["accentColor", t("carousel.design.accent"), accentColor, setAccentColor],
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
                              if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))
                                setter(e.target.value);
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

              {/* Model selector — reused */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("model.selector.label")}
                  </CardTitle>
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

              {/* Generate button */}
              <Button
                onClick={handleGenerateStory}
                disabled={isGeneratingStory || !storySubject.trim()}
                size="lg"
                className="instagram-gradient w-full gap-2 text-white"
              >
                {isGeneratingStory ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" />
                    {t("stories.button.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t("stories.button.generate")}
                  </>
                )}
              </Button>
            </div>

            {/* ── Right: Stories Preview ── */}
            <div className="space-y-4">
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    {t("stories.preview.title")}
                  </CardTitle>
                  {storyResult?.slides && (
                    <CardDescription>
                      {storyPreviewBlobs.length} / {storyResult.slides.length}{" "}
                      {t("stories.preview.slidesRendered")}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Story preview (9:16 aspect ratio) */}
                  <div
                    className="relative mx-auto w-full max-w-[240px] overflow-hidden rounded-xl bg-muted"
                    style={{ aspectRatio: "9/16" }}
                  >
                    {isGeneratingStory || isRenderingStory ? (
                      <Skeleton className="h-full w-full" />
                    ) : storyPreviewBlobs.length > 0 ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={storyPreviewBlobs[storyPreviewIndex]}
                          alt={`Story ${storyPreviewIndex + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {storyPreviewBlobs.length > 1 && (
                          <>
                            <button
                              onClick={() => setStoryPreviewIndex((i) => Math.max(0, i - 1))}
                              disabled={storyPreviewIndex === 0}
                              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-30"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                setStoryPreviewIndex((i) =>
                                  Math.min(storyPreviewBlobs.length - 1, i + 1)
                                )
                              }
                              disabled={storyPreviewIndex === storyPreviewBlobs.length - 1}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-30"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                              {storyPreviewBlobs.map((_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setStoryPreviewIndex(i)}
                                  className={`h-1.5 rounded-full transition-all ${
                                    i === storyPreviewIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
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
                        <p className="text-xs">{t("stories.preview.empty")}</p>
                      </div>
                    )}
                  </div>

                  {/* Download buttons */}
                  {storyPreviewBlobs.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={() => downloadStorySlide(storyPreviewIndex)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t("stories.download.slide")} {storyPreviewIndex + 1}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={downloadAllStories}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t("stories.download.all")}
                      </Button>
                    </div>
                  )}

                  {/* Instagram description */}
                  {storyResult?.instagramDescription && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("stories.description.label")}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={copyStoryDescription}
                        >
                          {storyCopied ? (
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
                        {storyResult.instagramDescription}
                      </div>
                      {storyResult.hashtags && storyResult.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {storyResult.hashtags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Schedule CTA */}
                  {storyResult?.success && storyPreviewBlobs.length > 0 && !showStorySchedule && (
                    <button
                      onClick={() => setShowStorySchedule(true)}
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 py-2 text-xs text-primary transition-colors hover:bg-primary/5"
                    >
                      📅 {t("calendar.schedule.cta")}
                    </button>
                  )}

                  {/* Error */}
                  {storyResult && !storyResult.success && (
                    <p className="text-xs text-destructive">
                      {storyResult.error ?? t("stories.error.generic")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}{" "}
        {/* end activeFormat === "stories" */}
        {/* ── Reels format ── */}
        {activeFormat === "reels" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            {/* ── Left: Reels form ── */}
            <div className="space-y-6">
              {/* Video description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">{t("reels.prompt.label")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <textarea
                    value={reelPrompt}
                    onChange={(e) => setReelPrompt(e.target.value)}
                    placeholder={t("reels.prompt.placeholder")}
                    rows={4}
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                  />

                  {/* Duration */}
                  <div>
                    <label className="mb-2 block text-xs text-muted-foreground">
                      {t("reels.duration.label")}
                    </label>
                    <div className="flex gap-2">
                      {[5, 6, 7, 8].map((d) => (
                        <button
                          key={d}
                          onClick={() => setReelDuration(d)}
                          className={`rounded-md border px-4 py-1.5 text-xs font-semibold transition-colors ${
                            reelDuration === d
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {d}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Veo model */}
                  <div>
                    <label className="mb-2 block text-xs text-muted-foreground">
                      {t("model.selector.label")}
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-md border border-primary bg-primary/10 px-3 py-2 text-xs font-semibold text-foreground">
                        Veo 3
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Video clips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">{t("reels.clips.label")}</CardTitle>
                  <CardDescription>{t("reels.clips.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleVideoUpload(e.dataTransfer.files);
                    }}
                    className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Upload className="h-6 w-6" />
                    <span>MP4 / MOV</span>
                  </button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/mov"
                    multiple
                    className="hidden"
                    onChange={(e) => handleVideoUpload(e.target.files)}
                  />
                  {reelClips.length > 0 && (
                    <div className="space-y-1">
                      {reelClipNames.map((name, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs"
                        >
                          <span className="truncate text-muted-foreground">{name}</span>
                          <button
                            onClick={() => {
                              setReelClips((prev) => prev.filter((_, idx) => idx !== i));
                              setReelClipNames((prev) => prev.filter((_, idx) => idx !== i));
                            }}
                            className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Audience — reused */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("carousel.audience.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        {t("carousel.audience.gender")}
                      </label>
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
                        <option value="all">{t("carousel.audience.genderAll")}</option>
                        <option value="female">{t("carousel.audience.genderFemale")}</option>
                        <option value="male">{t("carousel.audience.genderMale")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        {t("carousel.audience.ageRange")}
                      </label>
                      <select
                        value={audience.ageRange ?? "all"}
                        onChange={(e) => setAudience((a) => ({ ...a, ageRange: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="all">{t("carousel.audience.ageAll")}</option>
                        <option value="13-17">13–17</option>
                        <option value="18-24">18–24</option>
                        <option value="25-34">25–34</option>
                        <option value="35-44">35–44</option>
                        <option value="45-54">45–54</option>
                        <option value="55+">55+</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t("carousel.audience.region")}
                    </label>
                    <input
                      type="text"
                      value={audience.region}
                      onChange={(e) => setAudience((a) => ({ ...a, region: e.target.value }))}
                      placeholder={t("carousel.audience.regionPlaceholder")}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t("carousel.audience.interests")}
                    </label>
                    <input
                      type="text"
                      value={audience.interests}
                      onChange={(e) => setAudience((a) => ({ ...a, interests: e.target.value }))}
                      placeholder={t("carousel.audience.interestsPlaceholder")}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Brand guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("carousel.design.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        [
                          "primaryColor",
                          t("carousel.design.background"),
                          primaryColor,
                          setPrimaryColor,
                        ],
                        ["accentColor", t("carousel.design.accent"), accentColor, setAccentColor],
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
                              if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))
                                setter(e.target.value);
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

              {/* Lyria audio */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">{t("reels.audio.title")}</CardTitle>
                  <CardDescription>{t("reels.audio.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <textarea
                    value={audioPrompt}
                    onChange={(e) => setAudioPrompt(e.target.value)}
                    placeholder={t("reels.audio.placeholder")}
                    rows={2}
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex items-center gap-3">
                    <label htmlFor="audio-bpm" className="text-xs text-muted-foreground">
                      BPM
                    </label>
                    <input
                      id="audio-bpm"
                      type="range"
                      min={60}
                      max={200}
                      value={audioBpm}
                      onChange={(e) => setAudioBpm(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-10 text-right font-mono text-xs">{audioBpm}</span>
                  </div>
                  <Button
                    onClick={handleGenerateAudio}
                    disabled={isGeneratingAudio || !audioPrompt.trim()}
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                  >
                    {isGeneratingAudio ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5 animate-spin" />
                        {t("reels.audio.generating")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        {t("reels.audio.generate")}
                      </>
                    )}
                  </Button>
                  {audioResult?.audio && (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio src={audioResult.audio} controls className="w-full" />
                      <a
                        href={audioResult.audio}
                        download="reel-audio.wav"
                        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <Download className="h-3 w-3" />
                        {t("reels.audio.download")}
                      </a>
                    </div>
                  )}
                  {audioResult && !audioResult.success && (
                    <p className="text-xs text-destructive">
                      {audioResult.error ?? t("reels.error.generic")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Generate button */}
              <Button
                onClick={handleGenerateReel}
                disabled={isGeneratingReel || !reelPrompt.trim()}
                size="lg"
                className="instagram-gradient w-full gap-2 text-white"
              >
                {isGeneratingReel ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" />
                    {t("reels.button.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t("reels.button.generate")}
                  </>
                )}
              </Button>
            </div>

            {/* ── Right: Reel preview ── */}
            <div className="space-y-4">
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">{t("reels.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Video preview (9:16) */}
                  <div
                    className="relative mx-auto w-full max-w-[240px] overflow-hidden rounded-xl bg-muted"
                    style={{ aspectRatio: "9/16" }}
                  >
                    {isGeneratingReel ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3">
                        <Sparkles className="h-8 w-8 animate-spin text-violet-400" />
                        <p className="px-4 text-center text-xs text-muted-foreground">
                          {t("reels.button.generating")}
                        </p>
                      </div>
                    ) : reelBlobUrl ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        src={reelBlobUrl}
                        autoPlay
                        loop
                        controls
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <span className="text-4xl">🎬</span>
                        <p className="text-xs">{t("reels.preview.empty")}</p>
                      </div>
                    )}
                  </div>

                  {/* Download */}
                  {reelBlobUrl && (
                    <a
                      href={reelBlobUrl}
                      download="reel.mp4"
                      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t("reels.download")}
                    </a>
                  )}

                  {/* Schedule CTA */}
                  {reelResult?.success && reelBlobUrl && !showReelSchedule && (
                    <button
                      onClick={() => setShowReelSchedule(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 py-2 text-xs text-primary transition-colors hover:bg-primary/5"
                    >
                      📅 {t("calendar.schedule.cta")}
                    </button>
                  )}

                  {/* Error */}
                  {reelResult && !reelResult.success && (
                    <p className="text-xs text-destructive">
                      {reelResult.error === "Generation timed out"
                        ? t("reels.error.timeout")
                        : (reelResult.error ?? t("reels.error.generic"))}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}{" "}
        {/* end activeFormat === "reels" */}
      </div>

      {/* ── Schedule modals ───────────────────────────────────────────────── */}
      {showCarouselSchedule && (
        <ScheduleModal
          draft={{
            type: "carousel",
            caption: result?.instagramDescription ?? "",
            hashtags: result?.hashtags ?? [],
            assets: previewBlobs,
            igInstructions: {},
          }}
          slots={calendarSlots}
          onSchedule={(item) => {
            saveItem(item);
            setShowCarouselSchedule(false);
          }}
          onDismiss={() => setShowCarouselSchedule(false)}
        />
      )}
      {showStorySchedule && (
        <ScheduleModal
          draft={{
            type: "story",
            caption: storyResult?.instagramDescription ?? "",
            hashtags: storyResult?.hashtags ?? [],
            assets: storyPreviewBlobs,
            igInstructions: { stickers: ["Add a Poll sticker", "Add a Question sticker"] },
          }}
          slots={calendarSlots}
          onSchedule={(item) => {
            saveItem(item);
            setShowStorySchedule(false);
          }}
          onDismiss={() => setShowStorySchedule(false)}
        />
      )}
      {showReelSchedule && reelBlobUrl && (
        <ScheduleModal
          draft={{
            type: "reel",
            caption: reelPrompt,
            hashtags: [],
            assets: [reelBlobUrl],
            igInstructions: {},
          }}
          slots={calendarSlots}
          onSchedule={(item) => {
            saveItem(item);
            setShowReelSchedule(false);
          }}
          onDismiss={() => setShowReelSchedule(false)}
        />
      )}
    </div>
  );
}
