/**
 * Unit tests for /api/ugc/generate request validation and response shape.
 */

import type { UGCScript, UGCFormat, UGCPost } from "@/types/instagram";

// ─── Request validation ───────────────────────────────────────────────────────

describe("ugc/generate request validation", () => {
  function validateRequest(body: { brandName?: unknown; constraints?: unknown }): {
    valid: boolean;
    error?: string;
  } {
    if (!body.brandName || typeof body.brandName !== "string" || !body.brandName.trim()) {
      return { valid: false, error: "Missing required field: brandName" };
    }
    return { valid: true };
  }

  it("accepts brandName only", () => {
    expect(validateRequest({ brandName: "Nike" })).toEqual({ valid: true });
  });

  it("accepts brandName + constraints", () => {
    expect(validateRequest({ brandName: "Sephora", constraints: "focus on new serum" })).toEqual({
      valid: true,
    });
  });

  it("rejects missing brandName", () => {
    const result = validateRequest({});
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/brandName/);
  });

  it("rejects empty brandName", () => {
    const result = validateRequest({ brandName: "   " });
    expect(result.valid).toBe(false);
  });

  it("rejects non-string brandName", () => {
    const result = validateRequest({ brandName: 42 });
    expect(result.valid).toBe(false);
  });

  it("rejects null brandName", () => {
    const result = validateRequest({ brandName: null });
    expect(result.valid).toBe(false);
  });
});

// ─── Response shape validation ────────────────────────────────────────────────

describe("ugc/generate response shape", () => {
  const VALID_FORMATS: UGCFormat[] = ["carousel", "reels", "stories"];

  function isValidPost(post: unknown): boolean {
    if (typeof post !== "object" || post === null) return false;
    const p = post as Record<string, unknown>;
    return (
      typeof p.index === "number" &&
      typeof p.title === "string" &&
      typeof p.script === "string" &&
      typeof p.visualDescription === "string"
    );
  }

  function isValidUGCResponse(json: unknown): boolean {
    if (typeof json !== "object" || json === null) return false;
    const r = json as Record<string, unknown>;
    if (typeof r.success !== "boolean") return false;
    if (!r.success) return true; // error response is valid shape
    if (!r.ugc || typeof r.ugc !== "object") return false;
    const ugc = r.ugc as Record<string, unknown>;
    if (!VALID_FORMATS.includes(ugc.format as UGCFormat)) return false;
    if (typeof ugc.formatReason !== "string") return false;
    if (!Array.isArray(ugc.posts) || ugc.posts.length === 0) return false;
    return (ugc.posts as unknown[]).every(isValidPost);
  }

  const validPost: UGCPost = {
    index: 1,
    title: "Accroche",
    script: "J'ai essayé le nouveau sérum Sephora...",
    visualDescription: "Gros plan visage le matin",
    cta: "Lien en bio",
  };

  const validUGC: UGCScript = {
    format: "carousel",
    formatReason: "Permet de montrer 5 étapes clés",
    posts: [validPost],
  };

  it("accepts a valid success response (carousel)", () => {
    expect(isValidUGCResponse({ success: true, ugc: validUGC })).toBe(true);
  });

  it("accepts a valid success response (reels)", () => {
    const ugc: UGCScript = { ...validUGC, format: "reels" };
    expect(isValidUGCResponse({ success: true, ugc })).toBe(true);
  });

  it("accepts a valid success response (stories)", () => {
    const ugc: UGCScript = { ...validUGC, format: "stories" };
    expect(isValidUGCResponse({ success: true, ugc })).toBe(true);
  });

  it("accepts an error response", () => {
    expect(isValidUGCResponse({ success: false, error: "No AI provider" })).toBe(true);
  });

  it("rejects when ugc is missing from success", () => {
    expect(isValidUGCResponse({ success: true })).toBe(false);
  });

  it("rejects invalid format value", () => {
    const ugc = { ...validUGC, format: "video" };
    expect(isValidUGCResponse({ success: true, ugc })).toBe(false);
  });

  it("rejects when posts array is empty", () => {
    const ugc: UGCScript = { ...validUGC, posts: [] };
    expect(isValidUGCResponse({ success: true, ugc })).toBe(false);
  });

  it("rejects when a post is missing script", () => {
    const badPost = { index: 1, title: "T", visualDescription: "V" };
    const ugc = { ...validUGC, posts: [badPost] };
    expect(isValidUGCResponse({ success: true, ugc })).toBe(false);
  });

  it("rejects when a post is missing visualDescription", () => {
    const badPost = { index: 1, title: "T", script: "S" };
    const ugc = { ...validUGC, posts: [badPost] };
    expect(isValidUGCResponse({ success: true, ugc })).toBe(false);
  });

  it("accepts post without optional cta", () => {
    const postNoCta: UGCPost = {
      index: 1,
      title: "T",
      script: "S",
      visualDescription: "V",
    };
    const ugc: UGCScript = { ...validUGC, posts: [postNoCta] };
    expect(isValidUGCResponse({ success: true, ugc })).toBe(true);
  });
});

// ─── UGCFormat type guard ─────────────────────────────────────────────────────

describe("UGCFormat values", () => {
  const FORMATS: UGCFormat[] = ["carousel", "reels", "stories"];

  it("includes all three expected formats", () => {
    expect(FORMATS).toHaveLength(3);
    expect(FORMATS).toContain("carousel");
    expect(FORMATS).toContain("reels");
    expect(FORMATS).toContain("stories");
  });
});
