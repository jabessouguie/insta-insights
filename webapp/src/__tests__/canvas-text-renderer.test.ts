/**
 * @jest-environment jsdom
 */
import { drawStyledTextBlock, fitFontSize, wrapText } from "@/lib/canvas-text-renderer";
import type { CarouselTextStyle } from "@/types/instagram";

// ─── Canvas mock factory ───────────────────────────────────────────────────────

function makeCtx(charWidth = 10): CanvasRenderingContext2D {
  const ctx = {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    textAlign: "left" as CanvasTextAlign,
    shadowColor: "transparent",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    // measureText: width = number-of-chars × charWidth
    measureText: (t: string) => ({ width: t.length * charWidth }),
    fillText: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arcTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
  } as unknown as CanvasRenderingContext2D;
  return ctx;
}

// ─── wrapText ─────────────────────────────────────────────────────────────────

describe("wrapText", () => {
  it("returns a single line when text fits", () => {
    const ctx = makeCtx(10);
    ctx.font = "400 16px Inter";
    const lines = wrapText(ctx, "short text", 200, 4);
    expect(lines).toEqual(["short text"]);
  });

  it("wraps at word boundaries when text overflows maxWidth", () => {
    // charWidth = 10, maxWidth = 60 → max 6 chars per line
    const ctx = makeCtx(10);
    ctx.font = "400 16px Inter";
    // "abc def" = 7 chars → should wrap to ["abc", "def"]
    const lines = wrapText(ctx, "abc def", 60, 4);
    expect(lines).toEqual(["abc", "def"]);
  });

  it("respects maxLines cap", () => {
    const ctx = makeCtx(10);
    ctx.font = "400 16px Inter";
    // 5 single-word tokens but maxLines = 2 → only first 2 lines
    const lines = wrapText(ctx, "a b c d e", 15, 2);
    expect(lines.length).toBeLessThanOrEqual(2);
  });

  it("handles empty string gracefully", () => {
    const ctx = makeCtx(10);
    ctx.font = "400 16px Inter";
    const lines = wrapText(ctx, "", 200, 4);
    expect(lines).toEqual([]);
  });
});

// ─── fitFontSize ──────────────────────────────────────────────────────────────

describe("fitFontSize", () => {
  it("returns startSize when text already fits", () => {
    // charWidth = 1 → "hello" = 5px wide, fits in maxWidth = 100
    const ctx = makeCtx(1);
    const size = fitFontSize(ctx, "hello", 100, 72, 20, "bold 72px Inter");
    expect(size).toBe(72);
  });

  it("shrinks size until text fits", () => {
    // charWidth = 20 → "hello" = 100px at any size
    // maxWidth = 80 → 100 > 80, must shrink
    const ctx = makeCtx(20);
    const size = fitFontSize(ctx, "hello", 80, 72, 20, "bold 72px Inter");
    // Since measureText always returns 100 regardless of font, size hits minSize
    expect(size).toBe(20);
  });
});

// ─── drawStyledTextBlock ──────────────────────────────────────────────────────

describe("drawStyledTextBlock", () => {
  const BASE_OPTS = {
    text: "Hello world",
    x: 90,
    y: 600,
    maxWidth: 900,
    font: "bold 72px Inter",
    fontSize: 72,
    color: "#ffffff",
    align: "left" as CanvasTextAlign,
    maxLines: 3,
    accentColor: "#e91e8c",
  };

  it("returns y > input y (advances vertical position)", () => {
    const ctx = makeCtx(10);
    const endY = drawStyledTextBlock(ctx, BASE_OPTS);
    expect(endY).toBeGreaterThan(BASE_OPTS.y);
  });

  it("calls fillText once for a single-line text", () => {
    const ctx = makeCtx(10); // "Hello world" = 11 chars × 10 = 110px < 900
    drawStyledTextBlock(ctx, BASE_OPTS);
    expect(ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it("returns input y immediately for empty string", () => {
    const ctx = makeCtx(10);
    const endY = drawStyledTextBlock(ctx, { ...BASE_OPTS, text: "" });
    expect(endY).toBe(BASE_OPTS.y);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it("applies shadow context props when style.shadow is true", () => {
    const ctx = makeCtx(10);
    const style: CarouselTextStyle = { shadow: true };
    drawStyledTextBlock(ctx, { ...BASE_OPTS, style });
    // Shadow should be cleared after drawing
    expect(ctx.shadowBlur).toBe(0);
    expect(ctx.shadowColor).toBe("transparent");
  });

  it("calls save/restore for non-zero rotation", () => {
    const ctx = makeCtx(10);
    const style: CarouselTextStyle = { rotation: 2 };
    drawStyledTextBlock(ctx, { ...BASE_OPTS, style });
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("does NOT call save/restore for zero rotation", () => {
    const ctx = makeCtx(10);
    const style: CarouselTextStyle = { rotation: 0 };
    drawStyledTextBlock(ctx, { ...BASE_OPTS, style });
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.restore).not.toHaveBeenCalled();
  });

  it("calls fillRect for highlight bg", () => {
    const ctx = makeCtx(10);
    const style: CarouselTextStyle = { bg: "highlight", bgColor: "#ff0000", bgOpacity: 0.8 };
    drawStyledTextBlock(ctx, { ...BASE_OPTS, style });
    // highlight draws a fillRect per line
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("returns y + lineHeight × lines for default (no wrapping)", () => {
    const ctx = makeCtx(1); // tiny char width → never wraps
    const endY = drawStyledTextBlock(ctx, { ...BASE_OPTS, text: "Hi" });
    // 1 line × lineHeight(72 × 1.18 = 84.96)
    const expected = BASE_OPTS.y + 72 * 1.18;
    expect(endY).toBeCloseTo(expected, 1);
  });
});
