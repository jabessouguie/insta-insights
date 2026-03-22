"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { useInstagramData } from "@/hooks/useInstagramData";
import { useT } from "@/lib/i18n";
import { captureEvent } from "@/lib/posthog";
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
  Loader2,
  Star,
  RefreshCw,
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
import { loadBrandSettings } from "@/lib/brand-settings-store";
import { saveCarouselContext, saveStoriesContext } from "@/lib/content-prompt-context-store";
import { OptimalSlotsWidget } from "@/components/creator/OptimalSlotsWidget";
import { drawStyledTextBlock, wrapText } from "@/lib/canvas-text-renderer";
import { ModelSelector } from "@/components/creator/ModelSelector";
import { getModelPref, saveModelPref, DEFAULT_MODEL } from "@/lib/model-prefs-store";

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

/**
 * Pre-measures all text blocks and returns a scale factor [0.55, 1.0] so that
 * title + subtitle + body fit within `available` pixels vertically.
 */
function computeLayoutScale(
  ctx: CanvasRenderingContext2D,
  slide: CarouselSlideContent,
  fonts: CarouselFonts,
  maxTextWidth: number,
  titleSize: number,
  subtitleSize: number,
  bodySize: number,
  available: number
): number {
  const lh = (s: number) => s * 1.18;
  ctx.font = `bold ${titleSize}px "${fonts.title}"`;
  let total = wrapText(ctx, slide.title, maxTextWidth, 3).length * lh(titleSize);
  if (slide.subtitle) {
    ctx.font = `500 ${subtitleSize}px "${fonts.subtitle}"`;
    total += 12 + wrapText(ctx, slide.subtitle, maxTextWidth, 2).length * lh(subtitleSize);
  }
  if (slide.body) {
    ctx.font = `400 ${bodySize}px "${fonts.body}"`;
    total += 16 + wrapText(ctx, slide.body, maxTextWidth, 3).length * lh(bodySize);
  }
  return total > available ? Math.max(0.55, available / total) : 1.0;
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
  const S = SLIDE_SIZE;

  // ── Background (common to all layouts) ──────────────────────────────────
  const photo = photos[slide.photoIndex] ?? photos[0] ?? null;
  if (photo) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(S / img.width, S / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = photo;
    });
  } else {
    const grad = ctx.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(1, accentColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
  }

  const layout = slide.layout ?? "classic";

  if (layout === "center") {
    // ── Full screen dim ────────────────────────────────────────────────────
    ctx.fillStyle = "rgba(0,0,0,0.58)";
    ctx.fillRect(0, 0, S, S);
    // ── Horizontal accent line above title ─────────────────────────────────
    ctx.fillStyle = accentColor;
    ctx.fillRect(S * 0.28, S * 0.4, S * 0.44, 5);
    // ── Centered text ──────────────────────────────────────────────────────
    ctx.textAlign = "center";
    let y = S * 0.47;
    ctx.font = `bold 90px "${fonts.title}"`;
    ctx.fillStyle = "#ffffff";
    for (const line of wrapText(ctx, slide.title, S - 160, 3)) {
      ctx.fillText(line, S / 2, y);
      y += 108;
    }
    if (slide.subtitle) {
      y += 12;
      ctx.font = `500 46px "${fonts.subtitle}"`;
      ctx.fillStyle = accentColor;
      for (const line of wrapText(ctx, slide.subtitle, S - 200, 2)) {
        ctx.fillText(line, S / 2, y);
        y += 58;
      }
    }
    if (slide.body) {
      y += 16;
      ctx.font = `400 36px "${fonts.body}"`;
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      for (const line of wrapText(ctx, slide.body, S - 200, 3)) {
        if (y < S - 60) {
          ctx.fillText(line, S / 2, y);
          y += 46;
        }
      }
    }
  } else if (layout === "top") {
    // ── Dark gradient from top down ────────────────────────────────────────
    const topGrad = ctx.createLinearGradient(0, 0, 0, S * 0.6);
    topGrad.addColorStop(0, "rgba(0,0,0,0.88)");
    topGrad.addColorStop(0.6, "rgba(0,0,0,0.55)");
    topGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, S, S * 0.6);
    // ── Left accent bar at top ─────────────────────────────────────────────
    ctx.fillStyle = accentColor;
    ctx.fillRect(60, S * 0.07, 6, S * 0.33);
    // ── Text at top ───────────────────────────────────────────────────────
    ctx.textAlign = "left";
    let y = S * 0.115;
    ctx.font = `bold 72px "${fonts.title}"`;
    ctx.fillStyle = "#ffffff";
    for (const line of wrapText(ctx, slide.title, S - 150, 3)) {
      ctx.fillText(line, 90, y);
      y += 84;
    }
    if (slide.subtitle) {
      y += 10;
      ctx.font = `500 44px "${fonts.subtitle}"`;
      ctx.fillStyle = accentColor;
      for (const line of wrapText(ctx, slide.subtitle, S - 150, 2)) {
        ctx.fillText(line, 90, y);
        y += 54;
      }
    }
    if (slide.body) {
      y += 14;
      ctx.font = `400 36px "${fonts.body}"`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const line of wrapText(ctx, slide.body, S - 150, 3)) {
        if (y < S * 0.5) {
          ctx.fillText(line, 90, y);
          y += 46;
        }
      }
    }
  } else if (layout === "card") {
    // ── Subtle vignette over photo ─────────────────────────────────────────
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, S, S);
    // ── Frosted glass card ─────────────────────────────────────────────────
    const cardX = 50;
    const cardY = Math.round(S * 0.51);
    const cardW = S - 100;
    const cardH = Math.round(S * 0.44);
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fillStyle = "rgba(8,8,8,0.84)";
    ctx.fill();
    // ── Accent left border on card ─────────────────────────────────────────
    ctx.fillStyle = accentColor;
    ctx.fillRect(cardX, cardY + 26, 5, cardH - 52);
    // ── Text inside card ──────────────────────────────────────────────────
    ctx.textAlign = "left";
    let y = cardY + 72;
    ctx.font = `bold 66px "${fonts.title}"`;
    ctx.fillStyle = "#ffffff";
    for (const line of wrapText(ctx, slide.title, cardW - 100, 3)) {
      ctx.fillText(line, cardX + 44, y);
      y += 80;
    }
    if (slide.subtitle) {
      y += 8;
      ctx.font = `500 40px "${fonts.subtitle}"`;
      ctx.fillStyle = accentColor;
      for (const line of wrapText(ctx, slide.subtitle, cardW - 100, 2)) {
        ctx.fillText(line, cardX + 44, y);
        y += 52;
      }
    }
    if (slide.body) {
      y += 12;
      ctx.font = `400 33px "${fonts.body}"`;
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      for (const line of wrapText(ctx, slide.body, cardW - 100, 3)) {
        if (y < cardY + cardH - 30) {
          ctx.fillText(line, cardX + 44, y);
          y += 44;
        }
      }
    }
  } else if (layout === "split") {
    // ── Solid brand color band on bottom 42% ──────────────────────────────
    const splitY = Math.round(S * 0.58);
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, splitY, S, S - splitY);
    // Dark overlay on band for text readability
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(0, splitY, S, S - splitY);
    // ── Accent divider line ────────────────────────────────────────────────
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, splitY - 5, S, 8);
    // ── Text on solid band ────────────────────────────────────────────────
    ctx.textAlign = "left";
    let y = splitY + 72;
    ctx.font = `bold 72px "${fonts.title}"`;
    ctx.fillStyle = "#ffffff";
    for (const line of wrapText(ctx, slide.title, S - 130, 3)) {
      if (y < S - 40) {
        ctx.fillText(line, 72, y);
        y += 84;
      }
    }
    if (slide.subtitle) {
      y += 8;
      ctx.font = `500 44px "${fonts.subtitle}"`;
      ctx.fillStyle = accentColor;
      for (const line of wrapText(ctx, slide.subtitle, S - 130, 2)) {
        if (y < S - 40) {
          ctx.fillText(line, 72, y);
          y += 54;
        }
      }
    }
    if (slide.body) {
      y += 12;
      ctx.font = `400 34px "${fonts.body}"`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const line of wrapText(ctx, slide.body, S - 130, 3)) {
        if (y < S - 40) {
          ctx.fillText(line, 72, y);
          y += 44;
        }
      }
    }
  } else {
    // ── "classic" (default) — adaptive font scaling ───────────────────────
    // ── Accent bar (left side)
    ctx.fillStyle = accentColor;
    ctx.fillRect(60, SLIDE_SIZE * 0.55, 6, SLIDE_SIZE * 0.38);

    const textX = 90;
    const maxTextWidth = SLIDE_SIZE - textX - 60;
    const titleStyle = { shadow: true };
    let textY = SLIDE_SIZE * 0.6;

    // ── Adaptive font scaling (prevents body from being cut off)
    const available = SLIDE_SIZE * 0.4 - 60; // = 372px
    const scale = computeLayoutScale(ctx, slide, fonts, maxTextWidth, 72, 44, 36, available);
    const titleSize = Math.round(72 * scale);
    const subtitleSize = Math.round(44 * scale);
    const bodySize = Math.round(36 * scale);

    // ── Title
    textY = drawStyledTextBlock(ctx, {
      text: slide.title,
      x: textX,
      y: textY,
      maxWidth: maxTextWidth,
      font: `bold ${titleSize}px "${fonts.title}"`,
      fontSize: titleSize,
      color: "#ffffff",
      align: "left",
      maxLines: 3,
      style: titleStyle,
      accentColor,
      bgPadding: 12,
    });

    // ── Subtitle
    textY += 12;
    textY = drawStyledTextBlock(ctx, {
      text: slide.subtitle,
      x: textX,
      y: textY,
      maxWidth: maxTextWidth,
      font: `500 ${subtitleSize}px "${fonts.subtitle}"`,
      fontSize: subtitleSize,
      color: accentColor,
      align: "left",
      maxLines: 2,
      style: { shadow: titleStyle.shadow ?? true },
      accentColor,
    });

    // ── Body
    if (slide.body) {
      textY += 16;
      drawStyledTextBlock(ctx, {
        text: slide.body,
        x: textX,
        y: textY,
        maxWidth: maxTextWidth,
        font: `400 ${bodySize}px "${fonts.body}"`,
        fontSize: bodySize,
        color: "rgba(255,255,255,0.85)",
        align: "left",
        maxLines: 3,
        style: { shadow: true },
        accentColor,
      });
    }
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      "image/png"
    )
  );
}

/** Draw rounded rect path for card layout (does not fill/stroke — caller must). */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Wrap text for story layout templates — auto-computes maxLines from fontSize. */
function wrapTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  const maxLines = Math.max(2, Math.floor((STORY_HEIGHT * 0.2) / (fontSize * 1.2)));
  return wrapText(ctx, text, maxWidth, maxLines);
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
  const W = STORY_WIDTH;
  const H = STORY_HEIGHT;

  // ── Background (common to all layouts) ──────────────────────────────────
  const photo = photos[slide.photoIndex] ?? photos[0] ?? null;
  if (photo) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(W / img.width, H / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = photo;
    });
  } else {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(1, accentColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  const layout = slide.layout ?? "classic";

  if (layout === "center") {
    // ── Full screen dim ────────────────────────────────────────────────────
    ctx.fillStyle = "rgba(0,0,0,0.58)";
    ctx.fillRect(0, 0, W, H);
    // ── Accent lines flanking the title ───────────────────────────────────
    ctx.fillStyle = accentColor;
    ctx.fillRect(W * 0.2, H * 0.38, W * 0.6, 5);
    // ── Centered text ──────────────────────────────────────────────────────
    ctx.textAlign = "center";
    let y = H * 0.42;
    ctx.font = `bold 110px "${fonts.title}"`;
    ctx.fillStyle = "#ffffff";
    for (const line of wrapTextCentered(ctx, slide.title, W - 160, 110)) {
      ctx.fillText(line, W / 2, y);
      y += 130;
    }
    if (slide.body) {
      y += 28;
      ctx.font = `400 54px "${fonts.body}"`;
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      for (const line of wrapTextCentered(ctx, slide.body, W - 180, 54)) {
        if (y < H - 120) {
          ctx.fillText(line, W / 2, y);
          y += 70;
        }
      }
    }
    // ── Bottom accent line ─────────────────────────────────────────────────
    ctx.fillStyle = accentColor;
    ctx.fillRect(W * 0.2, H - 100, W * 0.6, 5);
  } else if (layout === "top") {
    // ── Dark gradient from top ─────────────────────────────────────────────
    const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.52);
    topGrad.addColorStop(0, "rgba(0,0,0,0.9)");
    topGrad.addColorStop(0.6, "rgba(0,0,0,0.55)");
    topGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, H * 0.52);
    // ── Centered text at top ───────────────────────────────────────────────
    ctx.textAlign = "center";
    let y = H * 0.1;
    ctx.font = `bold 104px "${fonts.title}"`;
    ctx.fillStyle = "#ffffff";
    for (const line of wrapTextCentered(ctx, slide.title, W - 160, 104)) {
      ctx.fillText(line, W / 2, y);
      y += 122;
    }
    if (slide.body) {
      y += 24;
      ctx.font = `400 54px "${fonts.body}"`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const line of wrapTextCentered(ctx, slide.body, W - 180, 54)) {
        if (y < H * 0.48) {
          ctx.fillText(line, W / 2, y);
          y += 70;
        }
      }
    }
    // ── Accent bar below text ──────────────────────────────────────────────
    ctx.fillStyle = accentColor;
    ctx.fillRect(W * 0.35, y + 20, W * 0.3, 6);
  } else if (layout === "card") {
    // ── Subtle vignette ───────────────────────────────────────────────────
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, W, H);
    // ── Centered card ─────────────────────────────────────────────────────
    const cardX = 80;
    const cardY = Math.round(H * 0.5);
    const cardW = W - 160;
    const cardH = Math.round(H * 0.38);
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);
    ctx.fillStyle = "rgba(8,8,8,0.86)";
    ctx.fill();
    // ── Accent top border on card ──────────────────────────────────────────
    ctx.fillStyle = accentColor;
    ctx.fillRect(cardX + 30, cardY, cardW - 60, 6);
    // ── Text centered in card ─────────────────────────────────────────────
    ctx.textAlign = "center";
    let y = cardY + 90;
    ctx.font = `bold 96px "${fonts.title}"`;
    ctx.fillStyle = "#ffffff";
    for (const line of wrapTextCentered(ctx, slide.title, cardW - 80, 96)) {
      if (y < cardY + cardH - 40) {
        ctx.fillText(line, W / 2, y);
        y += 114;
      }
    }
    if (slide.body) {
      y += 20;
      ctx.font = `400 50px "${fonts.body}"`;
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      for (const line of wrapTextCentered(ctx, slide.body, cardW - 80, 50)) {
        if (y < cardY + cardH - 30) {
          ctx.fillText(line, W / 2, y);
          y += 64;
        }
      }
    }
  } else if (layout === "split") {
    // ── Solid color band on bottom 40% ────────────────────────────────────
    const splitY = Math.round(H * 0.6);
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, splitY, W, H - splitY);
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(0, splitY, W, H - splitY);
    // ── Accent divider ────────────────────────────────────────────────────
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, splitY - 5, W, 8);
    // ── Text on solid band, centered ──────────────────────────────────────
    ctx.textAlign = "center";
    let y = splitY + 110;
    ctx.font = `bold 104px "${fonts.title}"`;
    ctx.fillStyle = "#ffffff";
    for (const line of wrapTextCentered(ctx, slide.title, W - 160, 104)) {
      if (y < H - 60) {
        ctx.fillText(line, W / 2, y);
        y += 122;
      }
    }
    if (slide.body) {
      y += 24;
      ctx.font = `400 52px "${fonts.body}"`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const line of wrapTextCentered(ctx, slide.body, W - 180, 52)) {
        if (y < H - 60) {
          ctx.fillText(line, W / 2, y);
          y += 66;
        }
      }
    }
  } else {
    // ── "classic" (default) — adaptive font scaling ───────────────────────
    // ── Bottom accent line
    ctx.fillStyle = accentColor;
    ctx.fillRect(STORY_WIDTH * 0.1, STORY_HEIGHT - 80, STORY_WIDTH * 0.8, 6);

    const textX = STORY_WIDTH / 2;
    const maxTextWidth = STORY_WIDTH - 160;
    const titleStyle = { shadow: true };
    let textY = STORY_HEIGHT * 0.62;

    // ── Adaptive font scaling (prevents body from being cut off)
    const available = STORY_HEIGHT * 0.38 - 100; // = 628px
    const scale = computeLayoutScale(ctx, slide, fonts, maxTextWidth, 100, 0, 52, available);
    const titleSize = Math.round(100 * scale);
    const bodySize = Math.round(52 * scale);

    // ── Title
    textY = drawStyledTextBlock(ctx, {
      text: slide.title,
      x: textX,
      y: textY,
      maxWidth: maxTextWidth,
      font: `bold ${titleSize}px "${fonts.title}"`,
      fontSize: titleSize,
      color: "#ffffff",
      align: "center",
      maxLines: 4,
      style: titleStyle,
      accentColor,
      bgPadding: 16,
    });

    // ── Body
    if (slide.body) {
      textY += 24;
      drawStyledTextBlock(ctx, {
        text: slide.body,
        x: textX,
        y: textY,
        maxWidth: maxTextWidth,
        font: `400 ${bodySize}px "${fonts.body}"`,
        fontSize: bodySize,
        color: "rgba(255,255,255,0.85)",
        align: "center",
        maxLines: 3,
        style: { shadow: true },
        accentColor,
      });
    }
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      "image/png"
    )
  );
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
    regions: ["France"],
    interests: [],
    ageRanges: [],
    mode: "custom",
  });
  const [regionInput, setRegionInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [isLoadingInterests, setIsLoadingInterests] = useState(false);

  // Auto-fill audience from analytics when "my_audience" mode is selected
  const applyMyAudience = async () => {
    const ai = data?.audienceInsights;
    if (!ai) return;

    // Top gender
    const topGender =
      (ai.genderSplit?.female ?? 50) >= (ai.genderSplit?.male ?? 50) ? "female" : "male";
    // Top 3 countries
    const topRegions = ai.topCountries
      ? Object.entries(ai.topCountries)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([c]) => c)
      : ["France"];
    // Top 2 age groups (names only)
    const topAgeRanges = ai.ageGroups
      ? Object.entries(ai.ageGroups)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([a]) => a)
      : [];

    // Set regions + age ranges immediately, clear interests while AI derives them
    setAudience({
      gender: topGender as CarouselAudience["gender"],
      regions: topRegions.length ? topRegions : ["France"],
      interests: [],
      ageRanges: topAgeRanges,
      mode: "my_audience",
    });

    // Async: derive interests from AI analysis of the audience
    setIsLoadingInterests(true);
    try {
      const res = await fetch("/api/audience/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: data?.profile?.bio,
          posts: data?.posts?.slice(0, 10).map((p) => ({ caption: p.caption })),
          topCountries: topRegions,
          topAgeGroups: topAgeRanges,
          genderSplit: ai.genderSplit,
        }),
      });
      const json = (await res.json()) as { success: boolean; interests?: string[] };
      if (json.success && json.interests?.length) {
        setAudience((a) => ({ ...a, interests: json.interests! }));
      }
    } catch {
      // silently fail — user can add interests manually
    } finally {
      setIsLoadingInterests(false);
    }
  };
  const [fonts, setFonts] = useState<CarouselFonts>({
    title: "Playfair Display",
    subtitle: "Montserrat",
    body: "Inter",
  });
  const [primaryColor, setPrimaryColor] = useState("#1a1a2e");
  const [accentColor, setAccentColor] = useState("#e91e8c");
  const [numSlides, setNumSlides] = useState(6);
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const [slideFormat, setSlideFormat] = useState<"square" | "story">("square");
  const [photos, setPhotos] = useState<string[]>([]); // base64
  const [photoNames, setPhotoNames] = useState<string[]>([]);

  // Format switcher
  const [activeFormat, setActiveFormat] = useState<"carousel" | "stories" | "reels">("carousel");

  // Model selector — persisted per feature (useEffect avoids SSR/client hydration mismatch)
  const [aiModel, setAiModel] = useState(DEFAULT_MODEL);
  useEffect(() => {
    setAiModel(getModelPref("carousel"));
  }, []);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CarouselGenerateResponse | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewBlobs, setPreviewBlobs] = useState<string[]>([]); // object URLs
  const [previewBlobData, setPreviewBlobData] = useState<Blob[]>([]); // raw blobs for ZIP
  const [isRendering, setIsRendering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
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

  // Analytics state (carousel + stories)
  const [isAnalyzingCarousel, setIsAnalyzingCarousel] = useState(false);
  const [carouselAnalysis, setCarouselAnalysis] = useState<{
    topPerformingSlideTypes: string[];
    topContentAngles: string[];
    weakSlidePatterns: string[];
    promptFragment: string;
  } | null>(null);
  const [carouselContextApplied, setCarouselContextApplied] = useState(false);
  const [isAnalyzingStories, setIsAnalyzingStories] = useState(false);
  const [storiesAnalysis, setStoriesAnalysis] = useState<{
    topStoryFormats: string[];
    bestEngagementDrivers: string[];
    weakPatterns: string[];
    promptFragment: string;
  } | null>(null);
  const [storiesContextApplied, setStoriesContextApplied] = useState(false);

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

  // ── Load brand settings (fonts + colors) from settings page ─────────────
  useEffect(() => {
    const brand = loadBrandSettings();
    setFonts({
      title: brand.fontTitle,
      subtitle: brand.fontSubtitle,
      body: brand.fontBody,
    });
    setPrimaryColor(brand.primaryColor);
    setAccentColor(brand.accentColor);
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
  const [storyBlobData, setStoryBlobData] = useState<Blob[]>([]); // raw blobs for ZIP
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
      .slice(0, 20)
      .map(
        (file) =>
          new Promise<{ data: string; name: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ data: e.target!.result as string, name: file.name });
            reader.readAsDataURL(file);
          })
      );
    Promise.all(readers).then((results) => {
      setPhotos((prev) => [...prev, ...results.map((r) => r.data)].slice(0, 20));
      setPhotoNames((prev) => [...prev, ...results.map((r) => r.name)].slice(0, 20));
    });
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoNames((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /** Move a photo to index 0 so it becomes the carousel cover */
  const movePhotoToFront = useCallback((index: number) => {
    if (index === 0) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.unshift(moved);
      return next;
    });
    setPhotoNames((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.unshift(moved);
      return next;
    });
  }, []);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!subject.trim()) return;
    setIsGenerating(true);
    setResult(null);
    setPreviewBlobs([]);
    setPreviewBlobData([]);
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
        captureEvent("carousel_generated", {
          numSlides: json.slides.length,
          hasPhotos: photos.length > 0,
          slideFormat,
          audienceMode: audience.mode,
        });
        // Render slides to canvas
        setIsRendering(true);
        await loadFont(fonts.title);
        await loadFont(fonts.subtitle);
        await loadFont(fonts.body);

        const renderer = slideFormat === "story" ? renderStoryToBlob : renderSlideToBlob;
        const blobs: string[] = [];
        const blobData: Blob[] = [];
        for (const [i, slide] of json.slides.entries()) {
          const blob = await renderer(
            slide,
            photos,
            fonts,
            primaryColor,
            accentColor,
            i,
            json.slides.length
          );
          blobData.push(blob);
          blobs.push(URL.createObjectURL(blob));
        }
        setPreviewBlobData(blobData);
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
    a.download = `carousel-${slideFormat}-${index + 1}.png`;
    a.click();
  };

  const downloadAll = async () => {
    if (previewBlobData.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const slug =
      subject
        .trim()
        .slice(0, 40)
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase() || "carousel";
    const ts = new Date().toISOString().replace(/[-T:]/g, "").slice(0, 14);
    previewBlobData.forEach((blob, i) => {
      zip.file(`${slug}-slide-${i + 1}.png`, blob);
    });
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = `${slug}-${ts}.zip`;
    a.click();
  };

  // ── Refine (feedback loop) ────────────────────────────────────────────────
  const handleRefine = async () => {
    if (!refineFeedback.trim() || !result?.slides) return;
    setIsRefining(true);
    try {
      const res = await fetch("/api/carousel/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: result.slides,
          instagramDescription: result.instagramDescription ?? "",
          hashtags: result.hashtags ?? [],
          feedback: refineFeedback.trim(),
          language,
          model: aiModel,
        }),
      });
      const json: CarouselGenerateResponse = await res.json();
      if (json.success && json.slides) {
        setResult(json);
        setRefineFeedback("");
        // Re-render slides with the updated content
        setPreviewBlobs([]);
        setPreviewBlobData([]);
        setIsRendering(true);
        try {
          await loadFont(fonts.title);
          await loadFont(fonts.subtitle);
          await loadFont(fonts.body);
          const renderer = slideFormat === "story" ? renderStoryToBlob : renderSlideToBlob;
          const blobs: string[] = [];
          const blobData: Blob[] = [];
          for (let i = 0; i < json.slides.length; i++) {
            const blob = await renderer(
              json.slides[i]!,
              photos,
              fonts,
              primaryColor,
              accentColor,
              i,
              json.slides.length
            );
            blobData.push(blob);
            blobs.push(URL.createObjectURL(blob));
          }
          setPreviewBlobData(blobData);
          setPreviewBlobs(blobs);
        } finally {
          setIsRendering(false);
        }
      }
    } catch {
      // silent
    } finally {
      setIsRefining(false);
    }
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
    setStoryBlobData([]);
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
        const blobData: Blob[] = [];
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
          blobData.push(blob);
          blobs.push(URL.createObjectURL(blob));
        }
        setStoryBlobData(blobData);
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

  const downloadAllStories = async () => {
    if (storyBlobData.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const slug =
      storySubject
        .trim()
        .slice(0, 40)
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase() || "stories";
    const ts = new Date().toISOString().replace(/[-T:]/g, "").slice(0, 14);
    storyBlobData.forEach((blob, i) => {
      zip.file(`${slug}-story-${i + 1}.png`, blob);
    });
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = `${slug}-stories-${ts}.zip`;
    a.click();
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

  // ── Carousel analytics ────────────────────────────────────────────────────
  const handleAnalyzeCarousel = async () => {
    if (!data?.posts) return;
    setIsAnalyzingCarousel(true);
    setCarouselAnalysis(null);
    try {
      const carouselPosts = data.posts
        .filter((p) => p.mediaType === "CAROUSEL")
        .slice(0, 20)
        .map((p) => ({
          id: p.id,
          caption: p.caption,
          likes: p.likes,
          comments: p.comments,
          shares: p.shares,
          savedCount: p.savedCount,
          reach: p.reach,
          slides: [] as { index: number; text: string }[],
        }));

      if (!carouselPosts.length) return;

      const res = await fetch("/api/carousel/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: carouselPosts, profile: data.profile }),
      });
      const json: { success: boolean; analysis?: typeof carouselAnalysis } = await res.json();
      if (json.success && json.analysis) setCarouselAnalysis(json.analysis);
    } catch {
      // ignore
    } finally {
      setIsAnalyzingCarousel(false);
    }
  };

  // ── Stories analytics ─────────────────────────────────────────────────────
  const handleAnalyzeStories = async () => {
    if (!data?.posts) return;
    setIsAnalyzingStories(true);
    setStoriesAnalysis(null);
    try {
      const storyPosts = data.posts
        .filter((p) => p.mediaType === "STORY")
        .slice(0, 30)
        .map((p) => ({
          id: p.id,
          caption: p.caption,
          replies: p.comments,
          impressions: p.impressions,
          linkTaps: 0,
        }));

      if (!storyPosts.length) return;

      const res = await fetch("/api/stories/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stories: storyPosts, profile: data.profile }),
      });
      const json: { success: boolean; analysis?: typeof storiesAnalysis } = await res.json();
      if (json.success && json.analysis) setStoriesAnalysis(json.analysis);
    } catch {
      // ignore
    } finally {
      setIsAnalyzingStories(false);
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
        <div className="mb-6 flex w-full flex-wrap gap-1 rounded-lg bg-muted p-1 sm:w-fit">
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
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-xs text-muted-foreground">
                      {t("carousel.subject.slideFormat")}
                    </label>
                    {(["square", "story"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setSlideFormat(fmt)}
                        className={`rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${
                          slideFormat === fmt
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {fmt === "square" ? "⬛ Square 1:1" : "📱 Story 9:16"}
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
                            className={`h-16 w-16 rounded-md object-cover ${i === 0 ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                          />
                          {/* Cover badge on index 0 */}
                          {i === 0 && (
                            <span className="absolute -bottom-1 left-0 right-0 mx-auto w-fit rounded bg-primary px-1 py-px text-[8px] font-semibold text-primary-foreground">
                              Cover
                            </span>
                          )}
                          {/* Move-to-front button on non-cover photos */}
                          {i > 0 && (
                            <button
                              type="button"
                              title={t("carousel.photos.cover")}
                              onClick={() => movePhotoToFront(i)}
                              className="absolute -left-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <Star className="h-2.5 w-2.5" />
                            </button>
                          )}
                          {/* Remove button */}
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

              {/* Audience */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("carousel.audience.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* ── Audience mode selector ── */}
                  <div className="flex rounded-lg border border-border p-0.5 text-xs">
                    {(["custom", "my_audience", "optimized"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          if (mode === "my_audience") {
                            applyMyAudience();
                          } else {
                            setAudience((a) => ({ ...a, mode }));
                          }
                        }}
                        className={`flex-1 rounded-md px-2 py-1.5 text-center font-medium transition-colors ${
                          audience.mode === mode
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mode === "custom"
                          ? "Personnalisé"
                          : mode === "my_audience"
                            ? "Mon audience"
                            : "Optimisée"}
                      </button>
                    ))}
                  </div>

                  {audience.mode === "optimized" ? (
                    <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                      ✨ L'IA déterminera automatiquement l'audience la plus réactive pour ce sujet.
                    </p>
                  ) : (
                    <>
                      {/* Gender */}
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

                      {/* Age ranges — multi-select badges */}
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          Tranches d&apos;âge
                        </label>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {["13-17", "18-24", "25-34", "35-44", "45-54", "55+"].map((range) => (
                            <button
                              key={range}
                              type="button"
                              onClick={() =>
                                setAudience((a) => ({
                                  ...a,
                                  ageRanges: a.ageRanges.includes(range)
                                    ? a.ageRanges.filter((r) => r !== range)
                                    : [...a.ageRanges, range],
                                }))
                              }
                              className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
                                audience.ageRanges.includes(range)
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {range}
                            </button>
                          ))}
                        </div>
                        {audience.ageRanges.length === 0 && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Aucune sélection = tous les âges
                          </p>
                        )}
                      </div>

                      {/* Regions — tag input */}
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Régions</label>
                        {audience.regions.length > 0 && (
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            {audience.regions.map((r) => (
                              <span
                                key={r}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
                              >
                                {r}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAudience((a) => ({
                                      ...a,
                                      regions: a.regions.filter((x) => x !== r),
                                    }))
                                  }
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          value={regionInput}
                          onChange={(e) => setRegionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === ",") && regionInput.trim()) {
                              e.preventDefault();
                              const val = regionInput.trim().replace(/,$/, "");
                              if (val && !audience.regions.includes(val)) {
                                setAudience((a) => ({ ...a, regions: [...a.regions, val] }));
                              }
                              setRegionInput("");
                            }
                          }}
                          placeholder="France, Belgique… (Entrée pour ajouter)"
                          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      {/* Interests — tag input */}
                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          Centres d&apos;intérêt
                          {isLoadingInterests && <Loader2 className="h-3 w-3 animate-spin" />}
                        </label>
                        {isLoadingInterests && audience.interests.length === 0 && (
                          <p className="mb-1.5 text-[10px] italic text-muted-foreground">
                            Analyse de l&apos;audience en cours…
                          </p>
                        )}
                        {audience.interests.length > 0 && (
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            {audience.interests.map((interest) => (
                              <span
                                key={interest}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
                              >
                                {interest}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAudience((a) => ({
                                      ...a,
                                      interests: a.interests.filter((x) => x !== interest),
                                    }))
                                  }
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          value={interestInput}
                          onChange={(e) => setInterestInput(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === ",") && interestInput.trim()) {
                              e.preventDefault();
                              const val = interestInput.trim().replace(/,$/, "");
                              if (val && !audience.interests.includes(val)) {
                                setAudience((a) => ({ ...a, interests: [...a.interests, val] }));
                              }
                              setInterestInput("");
                            }
                          }}
                          placeholder="fitness, lifestyle… (Entrée pour ajouter)"
                          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </>
                  )}
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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(
                      [
                        ["gemini-3-flash-preview", t("model.flash3.label"), t("model.flash3.desc")],
                        [
                          "gemini-3.1-flash-preview",
                          t("model.flash31.label"),
                          t("model.flash31.desc"),
                        ],
                        ["gemini-3.1-pro-preview", t("model.pro31.label"), t("model.pro31.desc")],
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

              {/* Model selector + Generate button */}
              <ModelSelector
                feature="carousel"
                value={aiModel}
                onChange={(m) => {
                  setAiModel(m);
                  saveModelPref("carousel", m);
                }}
                className="mb-2"
              />
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
                        {/* Posting order badge */}
                        <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white ring-1 ring-white/30">
                          {previewIndex + 1}
                        </div>
                        {/* HOOK badge on slide 1 */}
                        {previewIndex === 0 && (
                          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                            ⚡ Hook
                          </div>
                        )}
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
                    <>
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
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5 text-xs"
                          onClick={() => void downloadAll()}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {t("carousel.download.all")}
                        </Button>
                      </div>
                      {/* Posting order hint */}
                      {previewBlobs.length > 1 && (
                        <p className="text-center text-[11px] text-muted-foreground">
                          {t("carousel.posting.order")}
                        </p>
                      )}
                    </>
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

                  {/* Refine via feedback */}
                  {result?.success && (
                    <div className="space-y-2 rounded-xl border border-dashed border-border/60 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Affiner le carrousel
                      </p>
                      <textarea
                        value={refineFeedback}
                        onChange={(e) => setRefineFeedback(e.target.value)}
                        placeholder="Ex : rends le titre de la slide 1 plus accrocheur, change le CTA final, traduis en anglais…"
                        rows={2}
                        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRefine}
                        disabled={isRefining || isRendering || !refineFeedback.trim()}
                        className="gap-1.5 text-xs"
                      >
                        {isRefining || isRendering ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        {isRefining ? "Affinage…" : isRendering ? "Rendu…" : "Appliquer"}
                      </Button>
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

                  {/* ── Optimal slots widget ── */}
                  {result?.success && calendarSlots.length > 0 && (
                    <OptimalSlotsWidget
                      slots={calendarSlots}
                      contentType="carousel"
                      caption={result.instagramDescription}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}{" "}
        {/* end activeFormat === "carousel" */}
        {/* ── Carousel analytics panel ── */}
        {activeFormat === "carousel" && data?.posts && (
          <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Analyser mes carousels</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Identifie les types de slides et angles qui performent le mieux via IA. (Gemini
                  Vision utilisé si disponible)
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAnalyzeCarousel}
                disabled={
                  isAnalyzingCarousel ||
                  !data?.posts?.filter((p) => p.mediaType === "CAROUSEL").length
                }
                className="shrink-0 gap-1.5"
              >
                {isAnalyzingCarousel ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />{" "}
                    Analyse...
                  </>
                ) : (
                  "Analyser"
                )}
              </Button>
            </div>
            {carouselAnalysis && (
              <div className="space-y-3">
                {carouselAnalysis.topPerformingSlideTypes.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-emerald-400">
                      Slides performants
                    </p>
                    <ul className="space-y-0.5">
                      {carouselAnalysis.topPerformingSlideTypes.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          • {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {carouselAnalysis.weakSlidePatterns.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-red-400">À éviter</p>
                    <ul className="space-y-0.5">
                      {carouselAnalysis.weakSlidePatterns.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          • {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {carouselAnalysis.promptFragment && (
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="flex-1 text-xs text-foreground">
                      {carouselAnalysis.promptFragment}
                    </p>
                    <Button
                      size="sm"
                      className="shrink-0 text-xs"
                      variant={carouselContextApplied ? "outline" : "default"}
                      onClick={() => {
                        saveCarouselContext({
                          topPerformingSlideTypes: carouselAnalysis.topPerformingSlideTypes,
                          topContentAngles: carouselAnalysis.topContentAngles,
                          promptFragment: carouselAnalysis.promptFragment,
                        });
                        setCarouselContextApplied(true);
                        setTimeout(() => setCarouselContextApplied(false), 3000);
                      }}
                    >
                      {carouselContextApplied ? "✓ Appliqué" : "Appliquer"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* ── Stories analytics panel ── */}
        {activeFormat === "stories" && data?.posts && (
          <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Analyser mes stories</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Identifie les formats et angles qui génèrent le plus d'interactions.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAnalyzeStories}
                disabled={
                  isAnalyzingStories || !data?.posts?.filter((p) => p.mediaType === "STORY").length
                }
                className="shrink-0 gap-1.5"
              >
                {isAnalyzingStories ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />{" "}
                    Analyse...
                  </>
                ) : (
                  "Analyser"
                )}
              </Button>
            </div>
            {storiesAnalysis && (
              <div className="space-y-3">
                {storiesAnalysis.topStoryFormats.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-emerald-400">
                      Formats performants
                    </p>
                    <ul className="space-y-0.5">
                      {storiesAnalysis.topStoryFormats.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          • {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {storiesAnalysis.promptFragment && (
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="flex-1 text-xs text-foreground">
                      {storiesAnalysis.promptFragment}
                    </p>
                    <Button
                      size="sm"
                      className="shrink-0 text-xs"
                      variant={storiesContextApplied ? "outline" : "default"}
                      onClick={() => {
                        saveStoriesContext({
                          topStoryFormats: storiesAnalysis.topStoryFormats,
                          bestEngagementDrivers: storiesAnalysis.bestEngagementDrivers,
                          promptFragment: storiesAnalysis.promptFragment,
                        });
                        setStoriesContextApplied(true);
                        setTimeout(() => setStoriesContextApplied(false), 3000);
                      }}
                    >
                      {storiesContextApplied ? "✓ Appliqué" : "Appliquer"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
                  {/* ── Audience mode selector ── */}
                  <div className="flex rounded-lg border border-border p-0.5 text-xs">
                    {(["custom", "my_audience", "optimized"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          if (mode === "my_audience") {
                            applyMyAudience();
                          } else {
                            setAudience((a) => ({ ...a, mode }));
                          }
                        }}
                        className={`flex-1 rounded-md px-2 py-1.5 text-center font-medium transition-colors ${
                          audience.mode === mode
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mode === "custom"
                          ? "Personnalisé"
                          : mode === "my_audience"
                            ? "Mon audience"
                            : "Optimisée"}
                      </button>
                    ))}
                  </div>

                  {audience.mode === "optimized" ? (
                    <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                      ✨ L'IA déterminera automatiquement l'audience la plus réactive pour ce sujet.
                    </p>
                  ) : (
                    <>
                      {/* Gender */}
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

                      {/* Age ranges — multi-select badges */}
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          Tranches d&apos;âge
                        </label>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {["13-17", "18-24", "25-34", "35-44", "45-54", "55+"].map((range) => (
                            <button
                              key={range}
                              type="button"
                              onClick={() =>
                                setAudience((a) => ({
                                  ...a,
                                  ageRanges: a.ageRanges.includes(range)
                                    ? a.ageRanges.filter((r) => r !== range)
                                    : [...a.ageRanges, range],
                                }))
                              }
                              className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
                                audience.ageRanges.includes(range)
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {range}
                            </button>
                          ))}
                        </div>
                        {audience.ageRanges.length === 0 && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Aucune sélection = tous les âges
                          </p>
                        )}
                      </div>

                      {/* Regions — tag input */}
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Régions</label>
                        {audience.regions.length > 0 && (
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            {audience.regions.map((r) => (
                              <span
                                key={r}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
                              >
                                {r}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAudience((a) => ({
                                      ...a,
                                      regions: a.regions.filter((x) => x !== r),
                                    }))
                                  }
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          value={regionInput}
                          onChange={(e) => setRegionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === ",") && regionInput.trim()) {
                              e.preventDefault();
                              const val = regionInput.trim().replace(/,$/, "");
                              if (val && !audience.regions.includes(val)) {
                                setAudience((a) => ({ ...a, regions: [...a.regions, val] }));
                              }
                              setRegionInput("");
                            }
                          }}
                          placeholder="France, Belgique… (Entrée pour ajouter)"
                          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      {/* Interests — tag input */}
                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          Centres d&apos;intérêt
                          {isLoadingInterests && <Loader2 className="h-3 w-3 animate-spin" />}
                        </label>
                        {isLoadingInterests && audience.interests.length === 0 && (
                          <p className="mb-1.5 text-[10px] italic text-muted-foreground">
                            Analyse de l&apos;audience en cours…
                          </p>
                        )}
                        {audience.interests.length > 0 && (
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            {audience.interests.map((interest) => (
                              <span
                                key={interest}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
                              >
                                {interest}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAudience((a) => ({
                                      ...a,
                                      interests: a.interests.filter((x) => x !== interest),
                                    }))
                                  }
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          value={interestInput}
                          onChange={(e) => setInterestInput(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === ",") && interestInput.trim()) {
                              e.preventDefault();
                              const val = interestInput.trim().replace(/,$/, "");
                              if (val && !audience.interests.includes(val)) {
                                setAudience((a) => ({ ...a, interests: [...a.interests, val] }));
                              }
                              setInterestInput("");
                            }
                          }}
                          placeholder="fitness, lifestyle… (Entrée pour ajouter)"
                          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </>
                  )}
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
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(
                      [
                        ["gemini-3-flash-preview", t("model.flash3.label"), t("model.flash3.desc")],
                        [
                          "gemini-3.1-flash-preview",
                          t("model.flash31.label"),
                          t("model.flash31.desc"),
                        ],
                        ["gemini-3.1-pro-preview", t("model.pro31.label"), t("model.pro31.desc")],
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
                  {/* ── Audience mode selector ── */}
                  <div className="flex rounded-lg border border-border p-0.5 text-xs">
                    {(["custom", "my_audience", "optimized"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          if (mode === "my_audience") {
                            applyMyAudience();
                          } else {
                            setAudience((a) => ({ ...a, mode }));
                          }
                        }}
                        className={`flex-1 rounded-md px-2 py-1.5 text-center font-medium transition-colors ${
                          audience.mode === mode
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mode === "custom"
                          ? "Personnalisé"
                          : mode === "my_audience"
                            ? "Mon audience"
                            : "Optimisée"}
                      </button>
                    ))}
                  </div>

                  {audience.mode === "optimized" ? (
                    <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                      ✨ L'IA déterminera automatiquement l'audience la plus réactive pour ce sujet.
                    </p>
                  ) : (
                    <>
                      {/* Gender */}
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

                      {/* Age ranges — multi-select badges */}
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          Tranches d&apos;âge
                        </label>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {["13-17", "18-24", "25-34", "35-44", "45-54", "55+"].map((range) => (
                            <button
                              key={range}
                              type="button"
                              onClick={() =>
                                setAudience((a) => ({
                                  ...a,
                                  ageRanges: a.ageRanges.includes(range)
                                    ? a.ageRanges.filter((r) => r !== range)
                                    : [...a.ageRanges, range],
                                }))
                              }
                              className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
                                audience.ageRanges.includes(range)
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {range}
                            </button>
                          ))}
                        </div>
                        {audience.ageRanges.length === 0 && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Aucune sélection = tous les âges
                          </p>
                        )}
                      </div>

                      {/* Regions — tag input */}
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Régions</label>
                        {audience.regions.length > 0 && (
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            {audience.regions.map((r) => (
                              <span
                                key={r}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
                              >
                                {r}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAudience((a) => ({
                                      ...a,
                                      regions: a.regions.filter((x) => x !== r),
                                    }))
                                  }
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          value={regionInput}
                          onChange={(e) => setRegionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === ",") && regionInput.trim()) {
                              e.preventDefault();
                              const val = regionInput.trim().replace(/,$/, "");
                              if (val && !audience.regions.includes(val)) {
                                setAudience((a) => ({ ...a, regions: [...a.regions, val] }));
                              }
                              setRegionInput("");
                            }
                          }}
                          placeholder="France, Belgique… (Entrée pour ajouter)"
                          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      {/* Interests — tag input */}
                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          Centres d&apos;intérêt
                          {isLoadingInterests && <Loader2 className="h-3 w-3 animate-spin" />}
                        </label>
                        {isLoadingInterests && audience.interests.length === 0 && (
                          <p className="mb-1.5 text-[10px] italic text-muted-foreground">
                            Analyse de l&apos;audience en cours…
                          </p>
                        )}
                        {audience.interests.length > 0 && (
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            {audience.interests.map((interest) => (
                              <span
                                key={interest}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
                              >
                                {interest}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAudience((a) => ({
                                      ...a,
                                      interests: a.interests.filter((x) => x !== interest),
                                    }))
                                  }
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          value={interestInput}
                          onChange={(e) => setInterestInput(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === ",") && interestInput.trim()) {
                              e.preventDefault();
                              const val = interestInput.trim().replace(/,$/, "");
                              if (val && !audience.interests.includes(val)) {
                                setAudience((a) => ({ ...a, interests: [...a.interests, val] }));
                              }
                              setInterestInput("");
                            }
                          }}
                          placeholder="fitness, lifestyle… (Entrée pour ajouter)"
                          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </>
                  )}
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
