/**
 * Unit tests for the hashtag analyzer module.
 *
 * Covers:
 * - extractHashtags: standard, accented chars, mixed case, no hashtags, duplicates
 * - analyzeHashtags: frequency count, avg computation, sorting, empty input
 */

import { extractHashtags, analyzeHashtags } from "@/lib/hashtag-analyzer";
import type { InstagramPost } from "@/types/instagram";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePost(caption: string, likes = 100, comments = 10, savedCount = 5): InstagramPost {
  return {
    id: Math.random().toString(36).slice(2),
    timestamp: new Date("2024-01-01"),
    caption,
    mediaType: "IMAGE",
    likes,
    comments,
    shares: 0,
    reach: 1000,
    impressions: 1500,
    savedCount,
  };
}

// ─── extractHashtags ──────────────────────────────────────────────────────────

describe("extractHashtags", () => {
  it("extracts a single hashtag", () => {
    expect(extractHashtags("Hello #world")).toEqual(["#world"]);
  });

  it("extracts multiple hashtags", () => {
    expect(extractHashtags("Post about #travel and #food")).toEqual(["#travel", "#food"]);
  });

  it("normalises hashtags to lowercase", () => {
    expect(extractHashtags("#Travel #FOOD")).toEqual(["#travel", "#food"]);
  });

  it("returns empty array when no hashtags present", () => {
    expect(extractHashtags("No tags here")).toEqual([]);
  });

  it("handles empty string", () => {
    expect(extractHashtags("")).toEqual([]);
  });

  it("handles hashtags with accented characters", () => {
    const result = extractHashtags("#évasion #île #café");
    expect(result).toContain("#évasion");
    expect(result).toContain("#île");
  });

  it("handles hashtags at the start of caption", () => {
    expect(extractHashtags("#morning run today")).toEqual(["#morning"]);
  });

  it("handles hashtags at the end of caption", () => {
    expect(extractHashtags("Beautiful place #nature")).toEqual(["#nature"]);
  });

  it("does not extract lone # symbols", () => {
    expect(extractHashtags("Price # 50€ #fashion")).toEqual(["#fashion"]);
  });
});

// ─── analyzeHashtags ──────────────────────────────────────────────────────────

describe("analyzeHashtags", () => {
  it("returns empty array for empty post list", () => {
    expect(analyzeHashtags([])).toEqual([]);
  });

  it("returns empty array when no posts have hashtags", () => {
    const posts = [makePost("No hashtags here"), makePost("Another clean caption")];
    expect(analyzeHashtags(posts)).toEqual([]);
  });

  it("counts hashtag frequency correctly", () => {
    const posts = [makePost("#travel #food"), makePost("#travel #lifestyle"), makePost("#food")];
    const stats = analyzeHashtags(posts);
    const travel = stats.find((s) => s.tag === "#travel");
    const food = stats.find((s) => s.tag === "#food");
    const lifestyle = stats.find((s) => s.tag === "#lifestyle");

    expect(travel?.count).toBe(2);
    expect(food?.count).toBe(2);
    expect(lifestyle?.count).toBe(1);
  });

  it("sorts results by count descending", () => {
    const posts = [makePost("#a"), makePost("#b #a"), makePost("#c #a #b")];
    const stats = analyzeHashtags(posts);
    // #a appears 3 times, #b 2 times, #c 1 time
    expect(stats[0].tag).toBe("#a");
    expect(stats[1].tag).toBe("#b");
    expect(stats[2].tag).toBe("#c");
  });

  it("computes average likes correctly", () => {
    const posts = [makePost("#travel", 100, 10, 5), makePost("#travel", 200, 20, 10)];
    const stats = analyzeHashtags(posts);
    const travel = stats.find((s) => s.tag === "#travel");
    expect(travel?.avgLikes).toBe(150);
  });

  it("computes average comments correctly", () => {
    const posts = [makePost("#travel", 100, 10, 5), makePost("#travel", 200, 30, 5)];
    const stats = analyzeHashtags(posts);
    const travel = stats.find((s) => s.tag === "#travel");
    expect(travel?.avgComments).toBe(20);
  });

  it("computes average engagement (likes + comments + saves)", () => {
    // Post 1: likes=100, comments=10, saves=5 → engagement=115
    // Post 2: likes=200, comments=20, saves=10 → engagement=230
    // avg = (115 + 230) / 2 = 172 (rounded)
    const posts = [makePost("#travel", 100, 10, 5), makePost("#travel", 200, 20, 10)];
    const stats = analyzeHashtags(posts);
    const travel = stats.find((s) => s.tag === "#travel");
    // (115 + 230) / 2 = 172.5 → Math.round → 173
    expect(travel?.avgEngagement).toBe(173);
  });

  it("handles posts with no savedCount (undefined)", () => {
    const post = makePost("#test", 100, 10, 0);
    const stats = analyzeHashtags([post]);
    expect(stats[0].avgEngagement).toBe(110); // 100 + 10 + 0
  });

  it("treats same hashtag case-insensitively as one entry", () => {
    const posts = [makePost("#Travel"), makePost("#TRAVEL"), makePost("#travel")];
    const stats = analyzeHashtags(posts);
    expect(stats).toHaveLength(1);
    expect(stats[0].count).toBe(3);
  });

  it("returns the correct tag string format (lowercase with #)", () => {
    const stats = analyzeHashtags([makePost("#Fitness")]);
    expect(stats[0].tag).toBe("#fitness");
  });
});
