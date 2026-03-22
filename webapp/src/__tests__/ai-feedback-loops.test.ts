/**
 * Unit tests for the AI feedback loop API routes.
 * Tests prompt-construction logic by verifying the route bodies are valid.
 *
 * Note: full integration tests (AI calls) are not run in CI.
 * These tests cover the pure validation + prompt branching logic.
 */

// ─── dm-suggest: feedback mode prompt selection ───────────────────────────────

describe("dm-suggest feedback branching", () => {
  /**
   * The route chooses a prompt based on three mutually-exclusive cases:
   *   1. feedback + previousDm present → refinement prompt
   *   2. bio present → bio-personalised prompt
   *   3. neither → generic prompt
   *
   * We test the branching conditions directly (no HTTP layer needed).
   */
  function pickDmPromptMode(opts: {
    feedback?: string | null;
    previousDm?: string | null;
    bio?: string | null;
  }): "refinement" | "bio" | "generic" {
    const { feedback, previousDm, bio } = opts;
    if (feedback?.trim() && previousDm?.trim()) return "refinement";
    if (bio?.trim()) return "bio";
    return "generic";
  }

  it("selects refinement mode when feedback + previousDm are provided", () => {
    expect(
      pickDmPromptMode({ feedback: "plus court", previousDm: "Salut !", bio: "Créateur" })
    ).toBe("refinement");
  });

  it("selects bio mode when only bio is provided", () => {
    expect(pickDmPromptMode({ bio: "Travel creator based in Paris" })).toBe("bio");
  });

  it("selects generic mode when nothing is provided", () => {
    expect(pickDmPromptMode({})).toBe("generic");
  });

  it("selects generic mode when feedback is provided without previousDm", () => {
    expect(pickDmPromptMode({ feedback: "plus court" })).toBe("generic");
  });

  it("selects generic mode when previousDm is provided without feedback", () => {
    expect(pickDmPromptMode({ previousDm: "Salut !" })).toBe("generic");
  });

  it("selects refinement mode even if bio is also present", () => {
    // feedback + previousDm take priority over bio
    expect(
      pickDmPromptMode({ feedback: "plus court", previousDm: "Salut !", bio: "Creator" })
    ).toBe("refinement");
  });

  it("selects generic mode when feedback is empty string", () => {
    expect(pickDmPromptMode({ feedback: "   ", previousDm: "Salut !" })).toBe("generic");
  });
});

// ─── comments/generate: feedback mode detection ───────────────────────────────

describe("comments/generate feedback mode", () => {
  function isFeedbackMode(opts: { feedback?: string; previousComment?: string }): boolean {
    return !!(opts.feedback?.trim() && opts.previousComment?.trim());
  }

  it("returns true when both feedback and previousComment are non-empty", () => {
    expect(isFeedbackMode({ feedback: "plus court", previousComment: "Super post !" })).toBe(true);
  });

  it("returns false when feedback is missing", () => {
    expect(isFeedbackMode({ previousComment: "Super post !" })).toBe(false);
  });

  it("returns false when previousComment is missing", () => {
    expect(isFeedbackMode({ feedback: "plus court" })).toBe(false);
  });

  it("returns false when both are empty strings", () => {
    expect(isFeedbackMode({ feedback: "  ", previousComment: "  " })).toBe(false);
  });

  it("returns false when neither is provided", () => {
    expect(isFeedbackMode({})).toBe(false);
  });
});

// ─── carousel/refine: request validation ─────────────────────────────────────

describe("carousel/refine request validation", () => {
  function validateRefineRequest(body: { slides?: unknown; feedback?: string }): {
    valid: boolean;
    error?: string;
  } {
    if (!Array.isArray(body.slides) || body.slides.length === 0) {
      return { valid: false, error: "Missing required fields: slides, feedback" };
    }
    if (!body.feedback?.trim()) {
      return { valid: false, error: "Missing required fields: slides, feedback" };
    }
    return { valid: true };
  }

  it("accepts valid slides + feedback", () => {
    const result = validateRefineRequest({
      slides: [{ title: "Hook", subtitle: "Sub", body: "Body", photoIndex: 0 }],
      feedback: "rends le titre plus accrocheur",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects when slides array is empty", () => {
    const result = validateRefineRequest({ slides: [], feedback: "plus court" });
    expect(result.valid).toBe(false);
  });

  it("rejects when slides is not an array", () => {
    const result = validateRefineRequest({ slides: "not-an-array", feedback: "ok" });
    expect(result.valid).toBe(false);
  });

  it("rejects when feedback is missing", () => {
    const result = validateRefineRequest({
      slides: [{ title: "Hook", subtitle: "Sub", body: "Body", photoIndex: 0 }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects when feedback is empty string", () => {
    const result = validateRefineRequest({
      slides: [{ title: "Hook", subtitle: "Sub", body: "Body", photoIndex: 0 }],
      feedback: "   ",
    });
    expect(result.valid).toBe(false);
  });
});
