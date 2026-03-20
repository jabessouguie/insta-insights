/**
 * Unit tests for /api/carousel/refine-slide request validation
 * and for the FreeDMGenerator prompt mode (any-bio, outside listed accounts).
 */

import type { CarouselSlideContent } from "@/types/instagram";

// ─── carousel/refine-slide: request validation ────────────────────────────────

describe("carousel/refine-slide request validation", () => {
  function validateRefineSlideRequest(body: { slide?: unknown; feedback?: string }): {
    valid: boolean;
    error?: string;
  } {
    if (!body.slide || typeof body.slide !== "object" || Array.isArray(body.slide)) {
      return { valid: false, error: "Missing required field: slide" };
    }
    if (!body.feedback?.trim()) {
      return { valid: false, error: "Missing required field: feedback" };
    }
    return { valid: true };
  }

  const validSlide: CarouselSlideContent = {
    title: "Hook",
    subtitle: "Subtitle",
    body: "Body text",
    photoIndex: 0,
  };

  it("accepts valid slide + feedback", () => {
    expect(
      validateRefineSlideRequest({ slide: validSlide, feedback: "rends le titre plus court" })
    ).toEqual({ valid: true });
  });

  it("rejects when slide is missing", () => {
    const result = validateRefineSlideRequest({ feedback: "plus court" });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/slide/);
  });

  it("rejects when slide is an array", () => {
    const result = validateRefineSlideRequest({ slide: [validSlide], feedback: "ok" });
    expect(result.valid).toBe(false);
  });

  it("rejects when slide is a string", () => {
    const result = validateRefineSlideRequest({ slide: "not-an-object", feedback: "ok" });
    expect(result.valid).toBe(false);
  });

  it("rejects when feedback is missing", () => {
    const result = validateRefineSlideRequest({ slide: validSlide });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/feedback/);
  });

  it("rejects when feedback is empty string", () => {
    const result = validateRefineSlideRequest({ slide: validSlide, feedback: "   " });
    expect(result.valid).toBe(false);
  });

  it("rejects when both slide and feedback are missing", () => {
    const result = validateRefineSlideRequest({});
    expect(result.valid).toBe(false);
  });
});

// ─── carousel/refine-slide: response shape ────────────────────────────────────

describe("carousel/refine-slide response shape", () => {
  function isValidSlideResponse(json: unknown): boolean {
    if (typeof json !== "object" || json === null) return false;
    const r = json as Record<string, unknown>;
    if (typeof r.success !== "boolean") return false;
    if (!r.success) return true; // error response is valid shape
    if (!r.slide || typeof r.slide !== "object") return false;
    const s = r.slide as Record<string, unknown>;
    return (
      typeof s.title === "string" &&
      typeof s.subtitle === "string" &&
      typeof s.photoIndex === "number"
    );
  }

  it("accepts a valid success response", () => {
    expect(
      isValidSlideResponse({
        success: true,
        slide: { title: "T", subtitle: "S", body: "B", photoIndex: 0 },
      })
    ).toBe(true);
  });

  it("accepts a valid error response", () => {
    expect(isValidSlideResponse({ success: false, error: "AI not configured" })).toBe(true);
  });

  it("rejects when slide is missing from success response", () => {
    expect(isValidSlideResponse({ success: true })).toBe(false);
  });

  it("rejects when title is missing from slide", () => {
    expect(isValidSlideResponse({ success: true, slide: { subtitle: "S", photoIndex: 0 } })).toBe(
      false
    );
  });

  it("rejects when photoIndex is not a number", () => {
    expect(
      isValidSlideResponse({ success: true, slide: { title: "T", subtitle: "S", photoIndex: "0" } })
    ).toBe(false);
  });
});

// ─── FreeDMGenerator: any-bio prompt logic ───────────────────────────────────

describe("FreeDMGenerator prompt mode selection", () => {
  /**
   * When bio is provided, the dm-suggest API picks the bio-personalised prompt.
   * When both bio + feedback + previousDm are provided, it picks the refinement prompt.
   * This mirrors the server-side logic in /api/interactions/dm-suggest/route.ts.
   */
  function pickPromptMode(opts: {
    bio?: string;
    feedback?: string | null;
    previousDm?: string | null;
  }): "refinement" | "bio" | "generic" {
    const { bio, feedback, previousDm } = opts;
    if (feedback?.trim() && previousDm?.trim()) return "refinement";
    if (bio?.trim()) return "bio";
    return "generic";
  }

  it("picks bio mode when only bio is provided (free generator, no listed account)", () => {
    expect(pickPromptMode({ bio: "Travel creator based in Paris 🌍" })).toBe("bio");
  });

  it("picks refinement mode when feedback + previousDm are present (even with bio)", () => {
    expect(
      pickPromptMode({ bio: "Travel creator", feedback: "plus court", previousDm: "Salut !" })
    ).toBe("refinement");
  });

  it("picks bio mode when feedback is provided without previousDm", () => {
    // Missing previousDm → refinement not triggered, bio wins
    expect(pickPromptMode({ bio: "Creator", feedback: "plus court" })).toBe("bio");
  });

  it("picks generic mode when bio is empty", () => {
    expect(pickPromptMode({ bio: "   " })).toBe("generic");
  });

  it("picks generic mode when nothing is provided", () => {
    expect(pickPromptMode({})).toBe("generic");
  });
});

// ─── dm-suggest: language instruction builder ─────────────────────────────────

describe("dm-suggest language instruction", () => {
  function langInstruction(language?: "fr" | "en"): string {
    return language === "fr" ? "Write the message in French." : "Write the message in English.";
  }

  it("returns French instruction for fr", () => {
    expect(langInstruction("fr")).toBe("Write the message in French.");
  });

  it("returns English instruction for en", () => {
    expect(langInstruction("en")).toBe("Write the message in English.");
  });

  it("defaults to English when language is undefined", () => {
    expect(langInstruction(undefined)).toBe("Write the message in English.");
  });
});
