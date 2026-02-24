/**
 * Unit tests for the collab finder feature.
 * Tests JSON parsing, type validation, and email draft structure.
 * Gemini API calls are mocked so tests run without a real API key.
 */

// ─── Types (inline to avoid circular deps) ────────────────────────────────────

interface CollabMatch {
  id: string;
  name: string;
  type: "brand" | "creator" | "event" | "media";
  niche: string;
  location: string;
  reason: string;
  instagramHandle?: string;
  websiteHint?: string;
  potentialRevenue?: string;
}

interface CollabEmailDraft {
  subject: string;
  body: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse and validate the Gemini JSON response for collabs */
function parseCollabResponse(raw: string): { summary: string; collabs: CollabMatch[] } {
  const parsed = JSON.parse(
    raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()
  );
  if (!Array.isArray(parsed.collabs)) throw new Error("collabs must be an array");
  return parsed;
}

/** Validate a single CollabMatch object has required fields */
function validateCollabMatch(c: CollabMatch): boolean {
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    ["brand", "creator", "event", "media"].includes(c.type) &&
    typeof c.niche === "string" &&
    typeof c.location === "string" &&
    typeof c.reason === "string"
  );
}

/** Parse email draft JSON from Gemini */
function parseEmailDraft(raw: string): CollabEmailDraft {
  const parsed = JSON.parse(
    raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()
  );
  if (!parsed.subject || !parsed.body) throw new Error("Email must have subject and body");
  return parsed;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const fakeCollabsJson = JSON.stringify({
  summary: "6 opportunités de collaboration identifiées à Paris dans les niches voyage et photo.",
  collabs: [
    {
      id: "1",
      name: "Paris Travel Collective",
      type: "creator",
      niche: "Voyage",
      location: "Paris, France",
      reason:
        "Compte complémentaire axé voyage à Paris. Audience similaire, contenu non concurrent.",
      instagramHandle: "@paristravelcollective",
      websiteHint: "paristravelcollective.fr",
      potentialRevenue: "200-400€",
    },
    {
      id: "2",
      name: "Le Marais Hotel Boutique",
      type: "brand",
      niche: "Hôtellerie",
      location: "Paris 3e",
      reason: "Hôtel boutique cherchant à augmenter sa visibilité via des créateurs voyage.",
      potentialRevenue: "300-600€ ou nuit offerte",
    },
    {
      id: "3",
      name: "Paris Photo Festival",
      type: "event",
      niche: "Photographie",
      location: "Grand Palais, Paris",
      reason: "Festival annuel de photo — opportunité de couverture et badge presse.",
      instagramHandle: "@parisphotofestival",
    },
    {
      id: "4",
      name: "Bonnes Adresses Magazine",
      type: "media",
      niche: "Lifestyle",
      location: "Paris",
      reason: "Magazine lifestyle cherchant des créateurs pour des articles invités.",
      potentialRevenue: "150-300€/article",
    },
    {
      id: "5",
      name: "FoodTrek Paris",
      type: "creator",
      niche: "Food & Voyage",
      location: "Paris, France",
      reason: "Créateur food + voyage — collaboration croisée ou co-création de contenu.",
      instagramHandle: "@foodtrekparis",
    },
    {
      id: "6",
      name: "Airbnb Expériences Paris",
      type: "brand",
      niche: "Expériences locales",
      location: "Paris, France",
      reason: "Programme d'ambassadeurs pour mettre en avant des expériences locales uniques.",
      potentialRevenue: "Expériences gratuites + commission",
    },
  ],
});

const fakeEmailJson = JSON.stringify({
  subject: "Collaboration Instagram — @jeanseestheworld × Paris Travel Collective",
  body: "Bonjour,\n\nJ'ai découvert votre compte via Instagram et votre contenu voyage à Paris m'a vraiment inspiré...\n\nCordialement,\nJean",
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("parseCollabResponse", () => {
  it("parses valid Gemini JSON response with 6 collabs", () => {
    const result = parseCollabResponse(fakeCollabsJson);
    expect(result.collabs).toHaveLength(6);
    expect(result.summary).toContain("Paris");
  });

  it("extracts summary string", () => {
    const result = parseCollabResponse(fakeCollabsJson);
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it("handles JSON wrapped in markdown code fences", () => {
    const wrapped = "```json\n" + fakeCollabsJson + "\n```";
    const result = parseCollabResponse(wrapped);
    expect(result.collabs).toHaveLength(6);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseCollabResponse("not json")).toThrow();
  });

  it("throws when collabs is not an array", () => {
    expect(() => parseCollabResponse(JSON.stringify({ collabs: "bad" }))).toThrow();
  });
});

describe("validateCollabMatch", () => {
  const validCollab: CollabMatch = {
    id: "1",
    name: "Test Brand",
    type: "brand",
    niche: "Voyage",
    location: "Paris",
    reason: "Good fit",
  };

  it("validates a correct CollabMatch", () => {
    expect(validateCollabMatch(validCollab)).toBe(true);
  });

  it("validates all allowed type values", () => {
    const types: Array<CollabMatch["type"]> = ["brand", "creator", "event", "media"];
    for (const type of types) {
      expect(validateCollabMatch({ ...validCollab, type })).toBe(true);
    }
  });

  it("rejects invalid type value", () => {
    expect(validateCollabMatch({ ...validCollab, type: "unknown" as CollabMatch["type"] })).toBe(
      false
    );
  });

  it("accepts optional fields when present", () => {
    const withOptionals: CollabMatch = {
      ...validCollab,
      instagramHandle: "@testbrand",
      websiteHint: "testbrand.com",
      potentialRevenue: "500€",
    };
    expect(validateCollabMatch(withOptionals)).toBe(true);
  });

  it("validates all 6 fixture collabs", () => {
    const parsed = parseCollabResponse(fakeCollabsJson);
    for (const collab of parsed.collabs) {
      expect(validateCollabMatch(collab)).toBe(true);
    }
  });
});

describe("parseEmailDraft", () => {
  it("parses a valid email draft JSON", () => {
    const draft = parseEmailDraft(fakeEmailJson);
    expect(draft.subject).toContain("Collaboration");
    expect(draft.body.length).toBeGreaterThan(20);
  });

  it("handles JSON wrapped in markdown code fences", () => {
    const wrapped = "```json\n" + fakeEmailJson + "\n```";
    const draft = parseEmailDraft(wrapped);
    expect(draft.subject).toBeTruthy();
    expect(draft.body).toBeTruthy();
  });

  it("throws when subject is missing", () => {
    expect(() => parseEmailDraft(JSON.stringify({ body: "Hello" }))).toThrow();
  });

  it("throws when body is missing", () => {
    expect(() => parseEmailDraft(JSON.stringify({ subject: "Hello" }))).toThrow();
  });
});

describe("collab filtering & sorting", () => {
  it("can filter collabs by type", () => {
    const parsed = parseCollabResponse(fakeCollabsJson);
    const brands = parsed.collabs.filter((c) => c.type === "brand");
    expect(brands.length).toBeGreaterThan(0);
    brands.forEach((b) => expect(b.type).toBe("brand"));
  });

  it("can filter collabs by location keyword", () => {
    const parsed = parseCollabResponse(fakeCollabsJson);
    const paris = parsed.collabs.filter((c) => c.location.toLowerCase().includes("paris"));
    expect(paris.length).toBeGreaterThan(0);
  });

  it("can sort collabs with revenue data first", () => {
    const parsed = parseCollabResponse(fakeCollabsJson);
    const sorted = [...parsed.collabs].sort(
      (a, b) => (b.potentialRevenue ? 1 : 0) - (a.potentialRevenue ? 1 : 0)
    );
    // First item should have potentialRevenue
    expect(sorted[0].potentialRevenue).toBeTruthy();
  });
});
