import type { CarouselTextStyle } from "@/types/instagram";

// ─── Primitives ───────────────────────────────────────────────────────────────

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rx = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rx, y);
  ctx.lineTo(x + w - rx, y);
  ctx.arcTo(x + w, y, x + w, y + rx, rx);
  ctx.lineTo(x + w, y + h - rx);
  ctx.arcTo(x + w, y + h, x + w - rx, y + h, rx);
  ctx.lineTo(x + rx, y + h);
  ctx.arcTo(x, y + h, x, y + h - rx, rx);
  ctx.lineTo(x, y + rx);
  ctx.arcTo(x, y, x + rx, y, rx);
  ctx.closePath();
}

function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace(/^#/, "").padEnd(6, "0");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity.toFixed(2)})`;
}

// ─── Background styles ────────────────────────────────────────────────────────

function drawHighlight(
  ctx: CanvasRenderingContext2D,
  lineX: number,
  baseline: number,
  lineWidth: number,
  lineHeight: number,
  color: string,
  opacity: number,
  padding: number
): void {
  ctx.fillStyle = hexToRgba(color, opacity);
  ctx.fillRect(
    lineX - padding,
    baseline - lineHeight * 0.82,
    lineWidth + padding * 2,
    lineHeight * 1.05
  );
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  lineX: number,
  baseline: number,
  lineWidth: number,
  lineHeight: number,
  color: string,
  opacity: number,
  padding: number
): void {
  ctx.fillStyle = hexToRgba(color, opacity);
  const bx = lineX - padding;
  const by = baseline - lineHeight * 0.82;
  const bw = lineWidth + padding * 2;
  const bh = lineHeight * 1.05;
  drawRoundedRect(ctx, bx, by, bw, bh, bh / 2);
  ctx.fill();
}

function drawGlass(
  ctx: CanvasRenderingContext2D,
  blockX: number,
  blockTopY: number,
  blockWidth: number,
  blockHeight: number,
  accentColor: string,
  padding: number
): void {
  const bx = blockX - padding;
  const by = blockTopY - padding;
  const bw = blockWidth + padding * 2;
  const bh = blockHeight + padding * 2;
  const radius = 14;

  // Frosted glass fill
  ctx.fillStyle = "rgba(0,0,0,0.52)";
  drawRoundedRect(ctx, bx, by, bw, bh, radius);
  ctx.fill();

  // Thin white border
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, bx, by, bw, bh, radius);
  ctx.stroke();

  // Accent top edge
  ctx.strokeStyle = hexToRgba(accentColor, 0.7);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(bx + radius, by);
  ctx.lineTo(bx + bw - radius, by);
  ctx.stroke();
}

// ─── Font auto-scaling ────────────────────────────────────────────────────────

/**
 * Reduce the numeric size in `fontSpec` until `text` fits within `maxWidth`.
 * Returns the effective font size (clamped to minSize).
 */
export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  fontSpec: string
): number {
  let size = startSize;
  while (size > minSize) {
    ctx.font = fontSpec.replace(/\b\d+px\b/, `${size}px`);
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

// ─── Text wrap ────────────────────────────────────────────────────────────────

/**
 * Wrap `text` into lines that fit within `maxWidth` given the current ctx.font.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

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
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export interface DrawTextOpts {
  text: string;
  /** X anchor: left edge for "left" align, center point for "center" */
  x: number;
  /** Baseline Y of the first line */
  y: number;
  maxWidth: number;
  /** Full CSS font string, e.g. `bold 72px "Playfair Display"` */
  font: string;
  /** Numeric font size in px */
  fontSize: number;
  color: string;
  align?: CanvasTextAlign;
  maxLines?: number;
  style?: CarouselTextStyle;
  /** Used for glow and glass accent line */
  accentColor?: string;
  /** Horizontal padding around background elements */
  bgPadding?: number;
}

/**
 * Draw a block of styled text with optional background, shadow, glow and rotation.
 * Returns the Y baseline immediately after the last drawn line (y + n × lineHeight).
 */
export function drawStyledTextBlock(ctx: CanvasRenderingContext2D, opts: DrawTextOpts): number {
  if (!opts.text) return opts.y;

  const {
    text,
    x,
    y,
    maxWidth,
    color,
    align = "left",
    maxLines = 4,
    style,
    accentColor = "#e91e8c",
    bgPadding = 10,
  } = opts;

  // ── Effective font (auto-scale if requested) ──────────────────────────────
  let fontSize = opts.fontSize;
  let font = opts.font;
  if (style?.autoScale) {
    const newSize = fitFontSize(ctx, text, maxWidth, fontSize, Math.round(fontSize * 0.55), font);
    if (newSize !== fontSize) {
      font = font.replace(/\b\d+px\b/, `${newSize}px`);
      fontSize = newSize;
    }
  }

  ctx.font = font;
  const lineHeight = fontSize * 1.18;

  // ── Word wrap ─────────────────────────────────────────────────────────────
  const lines = wrapText(ctx, text, maxWidth, maxLines);
  if (lines.length === 0) return y;

  const lineWidths = lines.map((l) => ctx.measureText(l).width);
  const blockWidth = Math.max(...lineWidths);
  const blockHeight = lines.length * lineHeight;

  // ── Rotation setup ────────────────────────────────────────────────────────
  const rotation = style?.rotation ?? 0;
  if (rotation !== 0) {
    const pivotX = align === "center" ? x : x + blockWidth / 2;
    const pivotY = y - fontSize * 0.4 + blockHeight / 2;
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-pivotX, -pivotY);
  }

  const bgStyle = style?.bg ?? "none";
  const bgColor = style?.bgColor ?? accentColor;
  const bgOpacity = style?.bgOpacity ?? 0.85;

  // ── Glass background (covers entire block at once) ────────────────────────
  if (bgStyle === "glass") {
    const blockX = align === "center" ? x - blockWidth / 2 : x;
    const blockTopY = y - fontSize * 0.82;

    // Temporarily suppress shadow so the glass rect is not blurred
    const prev = {
      color: ctx.shadowColor,
      blur: ctx.shadowBlur,
      ox: ctx.shadowOffsetX,
      oy: ctx.shadowOffsetY,
    };
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    drawGlass(ctx, blockX, blockTopY, blockWidth, blockHeight, accentColor, bgPadding + 8);
    ctx.shadowColor = prev.color;
    ctx.shadowBlur = prev.blur;
    ctx.shadowOffsetX = prev.ox;
    ctx.shadowOffsetY = prev.oy;
  }

  // ── Apply shadow or glow ──────────────────────────────────────────────────
  if (style?.glow) {
    ctx.shadowColor = hexToRgba(accentColor, 0.85);
    ctx.shadowBlur = fontSize * 0.55;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  } else if (style?.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.72)";
    ctx.shadowBlur = fontSize * 0.3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
  }

  // ── Draw each line ────────────────────────────────────────────────────────
  ctx.textAlign = align;
  ctx.fillStyle = color;

  let currentY = y;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lw = lineWidths[i]!;
    const lineLeftX = align === "center" ? x - lw / 2 : x;

    // Per-line backgrounds (highlight / pill) — drawn without shadow
    if (bgStyle === "highlight" || bgStyle === "pill") {
      const prev = {
        color: ctx.shadowColor,
        blur: ctx.shadowBlur,
        ox: ctx.shadowOffsetX,
        oy: ctx.shadowOffsetY,
      };
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      if (bgStyle === "highlight") {
        drawHighlight(ctx, lineLeftX, currentY, lw, fontSize, bgColor, bgOpacity, bgPadding);
      } else {
        drawPill(ctx, lineLeftX, currentY, lw, fontSize, bgColor, bgOpacity, bgPadding + 6);
      }

      ctx.shadowColor = prev.color;
      ctx.shadowBlur = prev.blur;
      ctx.shadowOffsetX = prev.ox;
      ctx.shadowOffsetY = prev.oy;
    }

    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }

  // ── Clear shadow ──────────────────────────────────────────────────────────
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // ── Restore rotation ──────────────────────────────────────────────────────
  if (rotation !== 0) {
    ctx.restore();
  }

  return currentY;
}
