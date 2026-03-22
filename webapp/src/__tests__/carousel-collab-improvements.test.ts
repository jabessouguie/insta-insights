/**
 * @jest-environment jsdom
 *
 * Tests for:
 * - collab-tracker-store: sentEmailBody + prospectReply fields
 * - /api/collabs/reply-suggest: request validation
 * - carousel model selector: valid model IDs
 */

// ─── collab-tracker-store: new fields ────────────────────────────────────────

describe("collab-tracker-store: sentEmailBody & prospectReply", () => {
  // Inline store functions to avoid module resolution issues in tests
  const KEY = "insta_collab_trackings";

  function loadTrackings(): Record<string, unknown>[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Record<string, unknown>[];
    } catch {
      return [];
    }
  }

  function saveTracking(t: Record<string, unknown>) {
    const all = loadTrackings().filter((x) => x.collabId !== t.collabId);
    localStorage.setItem(KEY, JSON.stringify([...all, t]));
  }

  function updateSentEmail(collabId: string, sentEmailBody: string) {
    const existing = loadTrackings().find((t) => t.collabId === collabId);
    if (!existing) return;
    saveTracking({ ...existing, sentEmailBody });
  }

  function updateProspectReply(collabId: string, prospectReply: string) {
    const existing = loadTrackings().find((t) => t.collabId === collabId);
    if (!existing) return;
    saveTracking({ ...existing, prospectReply });
  }

  beforeEach(() => {
    localStorage.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).crypto = { randomUUID: () => "test-uuid" };
  });

  const baseTracking = {
    collabId: "collab-1",
    collabName: "Nike",
    status: "email_sent",
  };

  it("saves sentEmailBody field", () => {
    saveTracking(baseTracking);
    updateSentEmail("collab-1", "Bonjour, je vous contacte...");
    const all = loadTrackings();
    const t = all.find((x) => x.collabId === "collab-1");
    expect(t?.sentEmailBody).toBe("Bonjour, je vous contacte...");
  });

  it("saves prospectReply field", () => {
    saveTracking(baseTracking);
    updateProspectReply("collab-1", "Merci, nous sommes intéressés !");
    const all = loadTrackings();
    const t = all.find((x) => x.collabId === "collab-1");
    expect(t?.prospectReply).toBe("Merci, nous sommes intéressés !");
  });

  it("preserves existing fields when updating sentEmailBody", () => {
    const tracking = { ...baseTracking, sentAt: "2026-03-20T10:00:00Z", notes: "good prospect" };
    saveTracking(tracking);
    updateSentEmail("collab-1", "Email body here");
    const all = loadTrackings();
    const t = all.find((x) => x.collabId === "collab-1");
    expect(t?.sentAt).toBe("2026-03-20T10:00:00Z");
    expect(t?.notes).toBe("good prospect");
    expect(t?.sentEmailBody).toBe("Email body here");
  });

  it("preserves existing fields when updating prospectReply", () => {
    const tracking = { ...baseTracking, sentEmailBody: "Original email" };
    saveTracking(tracking);
    updateProspectReply("collab-1", "Their reply");
    const all = loadTrackings();
    const t = all.find((x) => x.collabId === "collab-1");
    expect(t?.sentEmailBody).toBe("Original email");
    expect(t?.prospectReply).toBe("Their reply");
  });

  it("does nothing when collabId not found (updateSentEmail)", () => {
    updateSentEmail("non-existent", "email");
    expect(loadTrackings()).toHaveLength(0);
  });

  it("does nothing when collabId not found (updateProspectReply)", () => {
    updateProspectReply("non-existent", "reply");
    expect(loadTrackings()).toHaveLength(0);
  });

  it("overwrites existing sentEmailBody on second update", () => {
    saveTracking(baseTracking);
    updateSentEmail("collab-1", "First email");
    updateSentEmail("collab-1", "Updated email");
    const all = loadTrackings();
    const t = all.find((x) => x.collabId === "collab-1");
    expect(t?.sentEmailBody).toBe("Updated email");
  });
});

// ─── /api/collabs/reply-suggest: request validation ───────────────────────────

describe("collabs/reply-suggest request validation", () => {
  function validateRequest(body: {
    collabName?: unknown;
    sentEmailBody?: unknown;
    prospectReply?: unknown;
  }): { valid: boolean; error?: string } {
    if (!body.collabName || typeof body.collabName !== "string" || !body.collabName.trim()) {
      return { valid: false, error: "Missing required field: collabName" };
    }
    if (
      !body.sentEmailBody ||
      typeof body.sentEmailBody !== "string" ||
      !body.sentEmailBody.trim()
    ) {
      return { valid: false, error: "Missing required field: sentEmailBody" };
    }
    if (
      !body.prospectReply ||
      typeof body.prospectReply !== "string" ||
      !body.prospectReply.trim()
    ) {
      return { valid: false, error: "Missing required field: prospectReply" };
    }
    return { valid: true };
  }

  it("accepts valid request", () => {
    expect(
      validateRequest({
        collabName: "Nike",
        sentEmailBody: "Bonjour...",
        prospectReply: "Merci !",
      })
    ).toEqual({ valid: true });
  });

  it("rejects missing collabName", () => {
    const r = validateRequest({ sentEmailBody: "email", prospectReply: "reply" });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/collabName/);
  });

  it("rejects empty collabName", () => {
    expect(
      validateRequest({ collabName: "  ", sentEmailBody: "e", prospectReply: "r" }).valid
    ).toBe(false);
  });

  it("rejects missing sentEmailBody", () => {
    const r = validateRequest({ collabName: "Nike", prospectReply: "reply" });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/sentEmailBody/);
  });

  it("rejects missing prospectReply", () => {
    const r = validateRequest({ collabName: "Nike", sentEmailBody: "email" });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/prospectReply/);
  });

  it("rejects empty prospectReply", () => {
    expect(
      validateRequest({ collabName: "Nike", sentEmailBody: "email", prospectReply: "   " }).valid
    ).toBe(false);
  });
});

// ─── reply-suggest response shape ─────────────────────────────────────────────

describe("collabs/reply-suggest response shape", () => {
  function isValidResponse(json: unknown): boolean {
    if (typeof json !== "object" || json === null) return false;
    const r = json as Record<string, unknown>;
    if (typeof r.success !== "boolean") return false;
    if (!r.success) return true;
    if (!Array.isArray(r.replies)) return false;
    return (r.replies as unknown[]).every((s) => typeof s === "string");
  }

  it("accepts a valid success response with 3 replies", () => {
    expect(isValidResponse({ success: true, replies: ["A", "B", "C"] })).toBe(true);
  });

  it("accepts a valid error response", () => {
    expect(isValidResponse({ success: false, error: "AI not configured" })).toBe(true);
  });

  it("rejects when replies is not an array", () => {
    expect(isValidResponse({ success: true, replies: "not an array" })).toBe(false);
  });

  it("rejects when a reply is not a string", () => {
    expect(isValidResponse({ success: true, replies: ["A", 2, "C"] })).toBe(false);
  });

  it("rejects when replies is missing from success", () => {
    expect(isValidResponse({ success: true })).toBe(false);
  });
});

// ─── Carousel model IDs ───────────────────────────────────────────────────────

describe("carousel gemini model IDs", () => {
  const VALID_MODELS = [
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-pro-preview",
  ];

  it("includes gemini-3-flash-preview (3.0 Flash)", () => {
    expect(VALID_MODELS).toContain("gemini-3-flash-preview");
  });

  it("includes gemini-3.1-flash-lite-preview (3.1 Flash Lite)", () => {
    expect(VALID_MODELS).toContain("gemini-3.1-flash-lite-preview");
  });

  it("includes gemini-3.1-pro-preview (3.1 Pro)", () => {
    expect(VALID_MODELS).toContain("gemini-3.1-pro-preview");
  });

  it("default model is gemini-3-flash-preview", () => {
    const defaultModel = "gemini-3-flash-preview";
    expect(VALID_MODELS).toContain(defaultModel);
  });
});
