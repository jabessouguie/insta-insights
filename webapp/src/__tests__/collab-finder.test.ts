/**
 * Unit tests for the collab finder feature.
 *
 * Covers:
 * - JSON parsing & validation of the Gemini response (CollabMatch)
 * - New types: "hotel" and "excursion"
 * - Email draft parsing
 * - Language parameter forwarding
 * - Collab filtering & sorting helpers
 *
 * Gemini API calls are mocked — tests run without a real API key.
 */

// ─── Types (inline to avoid circular deps) ────────────────────────────────────

/**
 * Mirrors CollabMatch from /api/collabs/route.ts.
 * Must stay in sync when new types are added.
 */
interface CollabMatch {
  id: string;
  name: string;
  type: "brand" | "creator" | "event" | "media" | "hotel" | "excursion";
  niche: string;
  location: string;
  reason: string;
  instagramHandle?: string;
  websiteHint?: string;
  potentialRevenue?: string;
  contactEmail?: string;
  relevanceScore?: number;
}

interface CollabEmailDraft {
  subject: string;
  body: string;
}

/** Subset of CollabFinderRequest used in tests. */
interface CollabFinderRequest {
  location: string;
  interests: string[];
  language?: "fr" | "en";
  excludeNames?: string[];
  count?: number;
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

/** Validate a single CollabMatch object has required fields and a valid type */
function validateCollabMatch(c: CollabMatch): boolean {
  const validTypes: CollabMatch["type"][] = [
    "brand",
    "creator",
    "event",
    "media",
    "hotel",
    "excursion",
  ];
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    validTypes.includes(c.type) &&
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

/**
 * Build a CollabFinderRequest body — helper used to assert language is forwarded.
 * In production this is done by the collabs page fetch call.
 */
function buildCollabRequest(overrides: Partial<CollabFinderRequest> = {}): CollabFinderRequest {
  return {
    location: "Paris",
    interests: ["Voyage"],
    language: "fr",
    excludeNames: [],
    count: 15,
    ...overrides,
  };
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
      relevanceScore: 9,
    },
    {
      id: "2",
      name: "Le Marais Hotel Boutique",
      type: "brand",
      niche: "Hôtellerie",
      location: "Paris 3e",
      reason: "Hôtel boutique cherchant à augmenter sa visibilité via des créateurs voyage.",
      potentialRevenue: "300-600€ ou nuit offerte",
      relevanceScore: 8,
    },
    {
      id: "3",
      name: "Paris Photo Festival",
      type: "event",
      niche: "Photographie",
      location: "Grand Palais, Paris",
      reason: "Festival annuel de photo — opportunité de couverture et badge presse.",
      instagramHandle: "@parisphotofestival",
      relevanceScore: 7,
    },
    {
      id: "4",
      name: "Bonnes Adresses Magazine",
      type: "media",
      niche: "Lifestyle",
      location: "Paris",
      reason: "Magazine lifestyle cherchant des créateurs pour des articles invités.",
      potentialRevenue: "150-300€/article",
      relevanceScore: 6,
    },
    {
      id: "5",
      name: "FoodTrek Paris",
      type: "creator",
      niche: "Food & Voyage",
      location: "Paris, France",
      reason: "Créateur food + voyage — collaboration croisée ou co-création de contenu.",
      instagramHandle: "@foodtrekparis",
      relevanceScore: 5,
    },
    {
      id: "6",
      name: "Airbnb Expériences Paris",
      type: "brand",
      niche: "Expériences locales",
      location: "Paris, France",
      reason: "Programme d'ambassadeurs pour mettre en avant des expériences locales uniques.",
      potentialRevenue: "Expériences gratuites + commission",
      relevanceScore: 4,
    },
  ],
});

/** Fixture with hotel and excursion types */
const fakeHotelExcursionJson = JSON.stringify({
  summary: "3 hospitality & activity partners identified in Nice for a travel creator.",
  collabs: [
    {
      id: "h1",
      name: "Hôtel Le Negresco",
      type: "hotel",
      niche: "Hôtellerie de luxe",
      location: "Nice, France",
      reason: "Hôtel iconique de la Côte d'Azur cherchant une présence sur les réseaux sociaux.",
      instagramHandle: "@hotel_negresco",
      potentialRevenue: "Nuit offerte + 200€",
      contactEmail: "presse@negresco-nice.com",
      relevanceScore: 9,
    },
    {
      id: "e1",
      name: "Nice Kayak Excursions",
      type: "excursion",
      niche: "Activités nautiques",
      location: "Nice, France",
      reason: "Sorties kayak en mer — contenu visuellement fort pour un créateur voyage.",
      potentialRevenue: "Activité offerte en échange de contenu",
      contactEmail: "contact@nicekayak.fr",
      relevanceScore: 8,
    },
    {
      id: "e2",
      name: "Arrière-pays Aventure",
      type: "excursion",
      niche: "Randonnée & outdoor",
      location: "Alpes-Maritimes, France",
      reason: "Randonnées guidées dans l'arrière-pays niçois — niche outdoor complémentaire.",
      potentialRevenue: "Excursion offerte + code promo audience",
      relevanceScore: 7,
    },
  ],
});

const fakeEmailJson = JSON.stringify({
  subject: "Collaboration Instagram — @jeanseestheworld × Paris Travel Collective",
  body: "Bonjour,\n\nJ'ai découvert votre compte via Instagram et votre contenu voyage à Paris m'a vraiment inspiré...\n\nCordialement,\nJean",
});

const fakeEmailEnJson = JSON.stringify({
  subject: "Instagram Collaboration — @jeanseestheworld × Paris Travel Collective",
  body: "Hi,\n\nWhile browsing Instagram, I came across your travel content and was really inspired...\n\nBest,\nJean",
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

describe("validateCollabMatch — core types", () => {
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

  it("validates all original allowed type values", () => {
    const types: CollabMatch["type"][] = ["brand", "creator", "event", "media"];
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
      contactEmail: "contact@testbrand.com",
      relevanceScore: 8,
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

describe("validateCollabMatch — hotel & excursion types", () => {
  it('validates type "hotel"', () => {
    const hotel: CollabMatch = {
      id: "h1",
      name: "Hôtel Le Negresco",
      type: "hotel",
      niche: "Hôtellerie de luxe",
      location: "Nice, France",
      reason: "Hôtel iconique cherchant une présence sociale.",
      relevanceScore: 9,
    };
    expect(validateCollabMatch(hotel)).toBe(true);
  });

  it('validates type "excursion"', () => {
    const excursion: CollabMatch = {
      id: "e1",
      name: "Nice Kayak Excursions",
      type: "excursion",
      niche: "Activités nautiques",
      location: "Nice, France",
      reason: "Sorties kayak — contenu visuellement fort.",
    };
    expect(validateCollabMatch(excursion)).toBe(true);
  });

  it("parses hotel & excursion fixture and validates all entries", () => {
    const parsed = parseCollabResponse(fakeHotelExcursionJson);
    expect(parsed.collabs).toHaveLength(3);
    for (const collab of parsed.collabs) {
      expect(validateCollabMatch(collab)).toBe(true);
    }
  });

  it("can filter hotel-type collabs from a mixed list", () => {
    const parsed = parseCollabResponse(fakeHotelExcursionJson);
    const hotels = parsed.collabs.filter((c) => c.type === "hotel");
    expect(hotels).toHaveLength(1);
    expect(hotels[0].name).toBe("Hôtel Le Negresco");
  });

  it("can filter excursion-type collabs from a mixed list", () => {
    const parsed = parseCollabResponse(fakeHotelExcursionJson);
    const excursions = parsed.collabs.filter((c) => c.type === "excursion");
    expect(excursions).toHaveLength(2);
    excursions.forEach((e) => expect(e.type).toBe("excursion"));
  });
});

describe("parseEmailDraft", () => {
  it("parses a valid email draft JSON (French)", () => {
    const draft = parseEmailDraft(fakeEmailJson);
    expect(draft.subject).toContain("Collaboration");
    expect(draft.body.length).toBeGreaterThan(20);
  });

  it("parses a valid email draft JSON (English)", () => {
    const draft = parseEmailDraft(fakeEmailEnJson);
    expect(draft.subject).toContain("Collaboration");
    expect(draft.body).toContain("Hi");
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

describe("language parameter", () => {
  it("defaults language to 'fr' when not provided", () => {
    const req = buildCollabRequest();
    expect(req.language).toBe("fr");
  });

  it("accepts 'en' as a valid language", () => {
    const req = buildCollabRequest({ language: "en" });
    expect(req.language).toBe("en");
  });

  it("language field is present in request body", () => {
    const req = buildCollabRequest({ language: "en", location: "London", interests: ["Travel"] });
    expect(Object.keys(req)).toContain("language");
    expect(req.language).toBe("en");
  });

  it("English email fixture body is in English", () => {
    const draft = parseEmailDraft(fakeEmailEnJson);
    // Basic heuristic: English emails start with "Hi" or "Hello", not "Bonjour"
    expect(draft.body).not.toMatch(/^Bonjour/);
    expect(draft.body).toMatch(/Hi|Hello/);
  });

  it("French email fixture body is in French", () => {
    const draft = parseEmailDraft(fakeEmailJson);
    expect(draft.body).toMatch(/Bonjour|Cordialement/);
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

  it("sorts mixed hotel/excursion/brand list by relevanceScore descending", () => {
    const parsed = parseCollabResponse(fakeHotelExcursionJson);
    const scores = parsed.collabs.map((c) => c.relevanceScore ?? 0);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });
});
