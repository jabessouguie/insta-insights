/**
 * Instagram HTML Export Parser
 * Parses the HTML files from Instagram's "Download Your Data" export.
 * Uses cheerio for server-side HTML parsing.
 */

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import fs from "fs";
import path from "path";
import type {
  InstagramAnalytics,
  InstagramFollower,
  InstagramPost,
  InstagramProfile,
  InstagramMetrics,
  FollowerGrowthPoint,
  ContentTypePerformance,
  MediaType,
  AudienceInsights,
  ContentInteractions,
  ReachInsights,
} from "@/types/instagram";
import { isJsonExport, parseJsonExport } from "@/lib/instagram-json-parser";

// ─── Path helpers ────────────────────────────────────────────────────────────

function getDataRoot(): string {
  const env = process.env.INSTAGRAM_DATA_PATH;
  if (env) return env;
  // webapp/ is one level below the repo root; data/ is at repo root
  return path.join(process.cwd(), "..", "data");
}

/** Return the first Instagram export folder found in data/ (also checks data/html/ and data/json/) */
function findExportFolder(): string | null {
  const root = getDataRoot();
  if (!fs.existsSync(root)) return null;

  // Search directly under data/
  const entries = fs.readdirSync(root);
  const direct = entries.find((e) => {
    const full = path.join(root, e);
    return fs.statSync(full).isDirectory() && e.startsWith("instagram-");
  });
  if (direct) return path.join(root, direct);

  // Also check data/html/ and data/json/ subdirectories
  for (const sub of ["html", "json"]) {
    const subDir = path.join(root, sub);
    if (!fs.existsSync(subDir)) continue;
    const subEntries = fs.readdirSync(subDir);
    const found = subEntries.find((e) => {
      const full = path.join(subDir, e);
      return fs.statSync(full).isDirectory() && e.startsWith("instagram-");
    });
    if (found) return path.join(subDir, found);
  }

  return null;
}

// ─── HTML parser helpers ──────────────────────────────────────────────────────

/** Parse French locale date strings from the Instagram HTML export.
 *  Format: "fév 22, 2026 8:58 am" or "janv. 5, 2025 3:00 pm" */
function parseFrenchDate(raw: string): Date | null {
  const MONTHS: Record<string, number> = {
    janv: 0,
    jan: 0,
    fév: 1,
    fev: 1,
    feb: 1,
    mars: 2,
    mar: 2,
    avr: 3,
    apr: 3,
    mai: 4,
    may: 4,
    juin: 5,
    jun: 5,
    juil: 6,
    jul: 6,
    août: 7,
    aout: 7,
    aug: 7,
    sept: 8,
    sep: 8,
    oct: 9,
    nov: 10,
    déc: 11,
    dec: 11,
  };
  // Normalise: strip dots, collapse spaces, lowercase
  const s = raw.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  const m = s.match(
    /^([a-zéûôàèùâêîäëïöü]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(am|pm))?)?/
  );
  if (!m) return null;
  const monthNum = MONTHS[m[1]];
  if (monthNum === undefined) return null;
  const day = parseInt(m[2]);
  const year = parseInt(m[3]);
  let hours = m[4] ? parseInt(m[4]) : 0;
  const minutes = m[5] ? parseInt(m[5]) : 0;
  if (m[6] === "pm" && hours < 12) hours += 12;
  if (m[6] === "am" && hours === 12) hours = 0;
  return new Date(year, monthNum, day, hours, minutes);
}

/** Parse an ISO-8601 or locale timestamp string into a Date.
 *  Returns new Date(0) (epoch) when the string is empty or unparseable,
 *  so callers can detect "no timestamp available". */
function parseTimestamp(raw: string): Date {
  const trimmed = raw.trim();
  if (!trimmed) return new Date(0);
  if (trimmed.includes("T")) return new Date(trimmed);
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;
  const french = parseFrenchDate(trimmed);
  if (french) return french;
  return new Date(0);
}

/** Read an HTML file and return a cheerio root */
function loadHtml(filePath: string): cheerio.CheerioAPI | null {
  if (!fs.existsSync(filePath)) return null;
  const html = fs.readFileSync(filePath, "utf-8");
  return cheerio.load(html);
}

// ─── Insight table parser helpers ─────────────────────────────────────────────

/**
 * Parses the recurring Instagram insights HTML table structure:
 *   <td class="_2pin _a6_q">Label<div><div>Value</div></div></td>
 * Returns a Map<label, value>.
 */
function parseInsightTable(exportFolder: string, relativePath: string): Map<string, string> {
  const filePath = path.join(exportFolder, relativePath);
  const $ = loadHtml(filePath);
  if (!$) return new Map();

  const map = new Map<string, string>();

  $("table tr").each((_, tr) => {
    const $td = $(tr).find("td");
    if (!$td.length) return;

    // Label = direct text node (clone the td, remove all child elements)
    // Normalise typographic apostrophe (U+2019) → ASCII apostrophe (U+0027)
    const $clone = $td.clone();
    $clone.find("*").remove();
    const label = $clone
      .text()
      .trim()
      .replace(/\u2019/g, "'");

    // Value = innermost div text
    const value = $td.find("div > div").first().text().trim();

    if (label && value) map.set(label, value);
  });

  return map;
}

/**
 * Parse an Instagram insights period string into [startDate, endDate].
 * Handles multiple formats:
 *   - "Nov 26 - Feb 23"              (English, no year  → infer from today)
 *   - "5 déc. 2024 – 28 févr. 2025" (French, with year)
 * Returns null if parsing fails.
 */
function parseInsightPeriod(period: string): [Date, Date] | null {
  const MONTHS: Record<string, number> = {
    // French
    janv: 0,
    jan: 0,
    fév: 1,
    fev: 1,
    févr: 1,
    mars: 2,
    mar: 2,
    avr: 3,
    apr: 3,
    mai: 4,
    may: 4,
    juin: 5,
    jun: 5,
    juil: 6,
    jul: 6,
    août: 7,
    aout: 7,
    aug: 7,
    sept: 8,
    sep: 8,
    oct: 9,
    nov: 10,
    déc: 11,
    dec: 11,
    // English
    january: 0,
    february: 1,
    feb: 1,
    march: 2,
    april: 3,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };

  const s = period.toLowerCase().replace(/\./g, "").trim();

  // ── Format A: "Nov 26 - Feb 23" (Mon DD, no year) ─────────────────────────
  const patA = /^([a-zéûôàèùâêîäëïöü]+)\s+(\d{1,2})\s*[-–—]\s*([a-zéûôàèùâêîäëïöü]+)\s+(\d{1,2})$/;
  const mA = s.match(patA);
  if (mA) {
    const startMonth = MONTHS[mA[1]];
    const startDay = parseInt(mA[2]);
    const endMonth = MONTHS[mA[3]];
    const endDay = parseInt(mA[4]);
    if (startMonth !== undefined && endMonth !== undefined) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDay = now.getDate();

      // Determine end year: if the end date is in the future relative to today,
      // it belongs to the current year; otherwise current year is right already.
      // If endMonth > currentMonth (or same month but day > today) → still this year.
      let endYear = currentYear;
      if (endMonth > currentMonth || (endMonth === currentMonth && endDay > currentDay)) {
        // End date hasn't happened yet this year — shouldn't occur for past insights
        // but guard just in case by staying in current year
        endYear = currentYear;
      }

      // Start year: if start month > end month the period crosses a year boundary
      const startYear = startMonth > endMonth ? endYear - 1 : endYear;

      const start = new Date(startYear, startMonth, startDay, 0, 0, 0, 0);
      const end = new Date(endYear, endMonth, endDay, 23, 59, 59, 999);
      return [start, end];
    }
  }

  // ── Format B: "5 déc. 2024 – 28 févr. 2025" (D Mon YYYY) ─────────────────
  const dateRe = /(\d{1,2})\s+([a-zéûôàèùâêîäëïöü]+)\.?\s+(\d{4})/gi;
  const dates: Date[] = [];
  let m;
  while ((m = dateRe.exec(s)) !== null) {
    const day = parseInt(m[1]);
    const monthKey = m[2].replace(/\.$/, "");
    const year = parseInt(m[3]);
    const monthNum = MONTHS[monthKey];
    if (monthNum !== undefined && day >= 1 && day <= 31) {
      dates.push(new Date(year, monthNum, day));
    }
  }
  if (dates.length >= 2) {
    const end = dates[dates.length - 1];
    end.setHours(23, 59, 59, 999);
    return [dates[0], end];
  }

  return null;
}

/** Parse a number string like "3,826" or "385340" or "-2,966" */
function parseNum(s: string): number {
  const cleaned = s.replace(/[,\s]/g, "");
  return parseInt(cleaned, 10) || 0;
}

/** Extract the first float from a string like "2.9%" or "-43.7% vs..." */
function parsePct(s: string): number {
  const m = s.match(/(-?[\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Parse a "Key: val%, Key2: val2%" string into a Record.
 * Handles keys with hyphens (e.g. "Non-followers") and values without % sign.
 */
function parseKVPcts(s: string): Record<string, number> {
  const result: Record<string, number> = {};
  // Match "Anything: 12.3%" patterns
  const re = /([^,:%]+):\s*([\d.]+)%?/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const key = m[1].trim();
    const val = parseFloat(m[2]);
    if (key) result[key] = val;
  }
  return result;
}

// ─── Insight parsers ──────────────────────────────────────────────────────────

function parseAudienceInsights(exportFolder: string): AudienceInsights | null {
  const map = parseInsightTable(
    exportFolder,
    "logged_information/past_instagram_insights/audience_insights.html"
  );
  if (!map.size) return null;

  const dailyActivity: Record<string, number> = {};
  for (const [key, val] of map.entries()) {
    if (key.startsWith("Activité des followers :")) {
      const day = key.replace("Activité des followers :", "").trim();
      dailyActivity[day] = parseNum(val);
    }
  }

  return {
    period: map.get("Période") ?? "",
    followerCount: parseNum(map.get("Followers") ?? "0"),
    followerCountChange: map.get("Nombre de followers") ?? "",
    followersGained: parseNum(map.get("Followers en plus") ?? "0"),
    followersLost: parseNum(map.get("Followers en moins") ?? "0"),
    netFollowerChange: parseNum(map.get("Total des followers") ?? "0"),
    topCities: parseKVPcts(map.get("Pourcentage de followers en fonction de la ville") ?? ""),
    topCountries: parseKVPcts(map.get("Pourcentage de followers en fonction du pays") ?? ""),
    ageGroups: parseKVPcts(
      map.get("Pourcentage de followers en fonction de l'âge pour tous les genres") ?? ""
    ),
    genderSplit: {
      male: parsePct(map.get("Pourcentage du total des followers hommes") ?? "0"),
      female: parsePct(map.get("Pourcentage du total des de followers femmes") ?? "0"),
    },
    dailyActivity,
  };
}

/** Count folders (conversation threads) inside a directory. */
function countSubDirs(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => {
    try {
      return fs.statSync(path.join(dir, f)).isDirectory();
    } catch {
      return false;
    }
  }).length;
}

/** Count entries in a JSON array stored under rootKey inside a file. */
function countJsonArray(filePath: string, rootKey: string): number {
  if (!fs.existsSync(filePath)) return 0;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
    const arr = raw[rootKey];
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Fallback: derive ContentInteractions from messages and story_interactions
 * when the official insight file (HTML or JSON) is absent.
 *
 * - messages/inbox/            → unique DM threads (bidirectional)
 * - messages/message_requests/ → inbound DMs from non-followers
 * - story_interactions/        → story likes + poll/Q&A/slider/quiz responses
 */
function deriveInteractionsFromActivity(exportFolder: string): ContentInteractions | null {
  const activityDir = path.join(exportFolder, "your_instagram_activity");

  const inboxCount = countSubDirs(path.join(activityDir, "messages", "inbox"));
  const requestsCount = countSubDirs(path.join(activityDir, "messages", "message_requests"));
  const totalDmAccounts = inboxCount + requestsCount;

  const siDir = path.join(activityDir, "story_interactions");
  const storyLikes = countJsonArray(
    path.join(siDir, "story_likes.json"),
    "story_activities_story_likes"
  );
  const storyPolls = countJsonArray(path.join(siDir, "polls.json"), "story_activities_polls");
  const storyQuestions = countJsonArray(
    path.join(siDir, "questions.json"),
    "story_activities_questions"
  );
  const storySliders = countJsonArray(
    path.join(siDir, "emoji_sliders.json"),
    "story_activities_emoji_sliders"
  );
  const storyQuizzes = countJsonArray(path.join(siDir, "quizzes.json"), "story_activities_quizzes");

  const storyReplies = storyPolls + storyQuestions + storySliders + storyQuizzes;
  const storyInteractions = storyLikes + storyReplies;

  if (totalDmAccounts === 0 && storyInteractions === 0) return null;

  const nonFollowerPct =
    totalDmAccounts > 0 ? Math.round((requestsCount / totalDmAccounts) * 100) : 0;

  return {
    period: "",
    totalInteractions: totalDmAccounts + storyInteractions,
    totalInteractionsChange: "",
    posts: { interactions: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
    stories: { interactions: storyInteractions, replies: storyReplies },
    reels: { interactions: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
    accountsInteracted: totalDmAccounts,
    accountsInteractedChange: "",
    nonFollowerInteractionPct: nonFollowerPct,
  };
}

function parseContentInteractions(exportFolder: string): ContentInteractions | null {
  const map = parseInsightTable(
    exportFolder,
    "logged_information/past_instagram_insights/content_interactions.html"
  );
  if (map.size) {
    const interactionPcts = parseKVPcts(
      map.get("Comptes ayant interagi par type de followers") ?? ""
    );
    const nonFollowerPct = interactionPcts["Non-followers"] ?? 0;

    return {
      period: map.get("Période") ?? "",
      totalInteractions: parseNum(map.get("Interactions avec le contenu") ?? "0"),
      totalInteractionsChange: map.get("Nombre d'interactions avec le contenu") ?? "",
      posts: {
        interactions: parseNum(map.get("Interactions avec les publications") ?? "0"),
        likes: parseNum(map.get("Mentions J'aime des publications") ?? "0"),
        comments: parseNum(map.get("Commentaires sur les publications") ?? "0"),
        shares: parseNum(map.get("Partages de publications") ?? "0"),
        saves: parseNum(map.get("Enregistrements de publications") ?? "0"),
      },
      stories: {
        interactions: parseNum(map.get("Interactions avec la story") ?? "0"),
        replies: parseNum(map.get("Réponses aux stories") ?? "0"),
      },
      reels: {
        interactions: parseNum(map.get("Interactions avec les reels") ?? "0"),
        likes: parseNum(map.get("Mentions J'aime sur les reels") ?? "0"),
        comments: parseNum(map.get("Commentaires sur les reels") ?? "0"),
        shares: parseNum(map.get("Partages des reels") ?? "0"),
        saves: parseNum(map.get("Enregistrements de reels") ?? "0"),
      },
      accountsInteracted: parseNum(map.get("Comptes ayant interagi") ?? "0"),
      accountsInteractedChange: map.get("Nombre de comptes ayant interagi") ?? "",
      nonFollowerInteractionPct: nonFollowerPct,
    };
  }

  // Fallback: derive from messages DMs + story interactions
  return deriveInteractionsFromActivity(exportFolder);
}

function parseReachInsights(exportFolder: string): ReachInsights | null {
  const map = parseInsightTable(
    exportFolder,
    "logged_information/past_instagram_insights/profiles_reached.html"
  );
  if (!map.size) return null;

  return {
    period: map.get("Période") ?? "",
    accountsReached: parseNum(map.get("Comptes touchés") ?? "0"),
    accountsReachedChange: map.get("Nombre de comptes touchés") ?? "",
    followerReachPct: parsePct(map.get("Followers") ?? "0"),
    nonFollowerReachPct: parsePct(map.get("Non-followers") ?? "0"),
    impressions: parseNum(map.get("Impressions") ?? "0"),
    impressionsChange: map.get("Nombre d'impressions") ?? "",
    profileVisits: parseNum(map.get("Visites du profil") ?? "0"),
    profileVisitsChange: map.get("Nombre de visites sur le profil") ?? "",
    externalLinkTaps: parseNum(map.get("Appuis sur les liens externes") ?? "0"),
  };
}

// ─── Followers & Following ────────────────────────────────────────────────────

function parseFollowerFile(filePath: string): InstagramFollower[] {
  const $ = loadHtml(filePath);
  if (!$) return [];

  const result: InstagramFollower[] = [];

  // Instagram export: each follower/following entry is a div.pam card.
  // Structure: div.pam > div._a6-p > div > [ div > a(username), div(date) ]
  $("div.pam").each((_: number, el: AnyNode) => {
    const $el = $(el);
    const link = $el.find("a[href*='instagram.com']").first();
    const username = link.text().trim().toLowerCase();
    if (!username || username.length < 2) return;
    // Timestamp is the next sibling div after the div wrapping the link
    const dateText = link.parent().next("div").text().trim();
    result.push({
      username,
      followedAt: parseTimestamp(dateText),
      isFollowingBack: false,
      isActive: false,
    });
  });

  return result;
}

function parseFollowers(exportFolder: string): InstagramFollower[] {
  const dir = path.join(exportFolder, "connections", "followers_and_following");
  if (!fs.existsSync(dir)) return [];

  const result: InstagramFollower[] = [];
  const files = fs.readdirSync(dir).filter((f) => f.startsWith("followers"));
  for (const file of files) {
    result.push(...parseFollowerFile(path.join(dir, file)));
  }
  return result;
}

function parseFollowing(exportFolder: string): InstagramFollower[] {
  const dir = path.join(exportFolder, "connections", "followers_and_following");
  const files = ["following.html", "following_hashtags.html"].map((f) => path.join(dir, f));
  const result: InstagramFollower[] = [];
  for (const file of files) {
    result.push(...parseFollowerFile(file));
  }
  return result;
}

// ─── Posts ────────────────────────────────────────────────────────────────────

function parsePostsFile(filePath: string, mediaType: MediaType): InstagramPost[] {
  const $ = loadHtml(filePath);
  if (!$) return [];

  const posts: InstagramPost[] = [];
  let idx = 0;

  // Instagram export: each post is a div.pam card.
  // Caption: h2 with class _a6-h (e.g. "_3-95 _2pim _a6-h _a6-i")
  // Timestamp: div with class _a6-o (e.g. "_3-94 _a6-o")
  $("div.pam").each((_: number, el: AnyNode) => {
    const $el = $(el);
    const caption = $el.find("h2[class*='_a6-h']").first().text().trim();
    const timestampText = $el.find("div[class*='_a6-o']").first().text().trim();

    posts.push({
      id: `post_${idx++}`,
      timestamp: parseTimestamp(timestampText),
      caption,
      mediaType,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      savedCount: 0,
    });
  });

  return posts;
}

/**
 * Parse archived posts and return a Set of their timestamps (ms) + captions
 * so we can exclude them from the active post list.
 */
function parseArchivedPostKeys(exportFolder: string): Set<string> {
  const filePath = path.join(
    exportFolder,
    "your_instagram_activity",
    "media",
    "archived_posts.html"
  );
  const $ = loadHtml(filePath);
  if (!$) return new Set();

  const keys = new Set<string>();
  $("div.pam").each((_: number, el: AnyNode) => {
    const $el = $(el);
    const caption = $el.find("h2[class*='_a6-h']").first().text().trim();
    const timestampText = $el.find("div[class*='_a6-o']").first().text().trim();
    const ts = parseTimestamp(timestampText).getTime();
    // Key = timestamp + first 40 chars of caption (collision-resistant enough)
    keys.add(`${ts}::${caption.substring(0, 40)}`);
  });

  return keys;
}

function parsePosts(exportFolder: string): InstagramPost[] {
  const mediaDir = path.join(exportFolder, "your_instagram_activity", "media");

  // Build an exclusion set from archived posts so they are never counted
  const archivedKeys = parseArchivedPostKeys(exportFolder);
  const isArchived = (p: InstagramPost) =>
    archivedKeys.has(`${p.timestamp.getTime()}::${p.caption.substring(0, 40)}`);

  const result: InstagramPost[] = [];

  const typeMap: Array<[string, MediaType]> = [
    ["posts_1.html", "IMAGE"],
    ["posts_2.html", "CAROUSEL"],
    ["reels.html", "REEL"],
    ["stories.html", "STORY"],
  ];

  for (const [file, type] of typeMap) {
    const parsed = parsePostsFile(path.join(mediaDir, file), type);
    result.push(...parsed.filter((p) => !isArchived(p)));
  }

  return result;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function parseProfile(
  exportFolder: string,
  followers: number,
  following: number,
  posts: number
): InstagramProfile {
  const piDir = path.join(exportFolder, "personal_information", "personal_information");
  const piFile = path.join(piDir, "personal_information.html");
  const $ = loadHtml(piFile);

  let username = "unknown";
  let fullName = "";
  let bio = "";
  let website = "";

  if ($) {
    $("table tr").each((_: number, el: AnyNode) => {
      const $el = $(el);
      const label = $el.find("td").eq(0).text().trim().toLowerCase();
      const value = $el.find("td").eq(1).text().trim();
      if (label.includes("username") || label.includes("nom d'utilisateur")) username = value;
      if (label.includes("name") && !label.includes("user")) fullName = value;
      if (label.includes("bio") || label.includes("biographie")) bio = value;
      if (label.includes("website") || label.includes("site")) website = value;
    });
  }

  const folderName = path.basename(exportFolder);
  const match = folderName.match(/instagram-([^-]+)-/);
  if (match && username === "unknown") username = match[1];

  return {
    username,
    fullName: fullName || username,
    bio,
    website,
    followerCount: followers,
    followingCount: following,
    postCount: posts,
    profilePicUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
    isVerified: false,
  };
}

// ─── Metrics computation ──────────────────────────────────────────────────────

function computeFollowerGrowth(
  followers: InstagramFollower[],
  realFollowerCount?: number
): FollowerGrowthPoint[] {
  const byMonth = new Map<string, number>();

  for (const f of followers) {
    // Skip entries with no reliable timestamp (epoch = parse failure fallback)
    if (f.followedAt.getTime() === 0) continue;
    const key = `${f.followedAt.getFullYear()}-${String(f.followedAt.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }

  const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

  // Offset the cumulative base so the last data point matches the real follower count.
  // Instagram exports often only contain a subset of followers (1 HTML file = ~1 000 entries),
  // while the actual total comes from audience_insights.html (e.g. 3 826).
  const parsedTotal = sorted.reduce((sum, [, gain]) => sum + gain, 0);
  const base =
    realFollowerCount && realFollowerCount > parsedTotal ? realFollowerCount - parsedTotal : 0;

  let cumulative = base;
  return sorted.map(([month, gain]) => {
    cumulative += gain;
    return { month, count: cumulative, gain, loss: 0 };
  });
}

function computePostingTimes(posts: InstagramPost[]) {
  // The Instagram HTML export does not include per-post likes/comments,
  // so we compute posting frequency (count) per day/hour instead.
  // This tells the creator when they publish most, which is the best
  // proxy for "active slots" derivable from export data alone.
  const byDay = new Map<string, number>();
  const byHour = new Map<number, number>();

  const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  for (const post of posts) {
    if (post.mediaType === "STORY") continue; // exclude ephemeral content
    const day = DAYS[post.timestamp.getDay()];
    const hour = post.timestamp.getHours();
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
  }

  const bestDays = [...byDay.entries()]
    .map(([day, count]) => ({ day, avgEngagement: count }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  const bestHours = [...byHour.entries()]
    .map(([hour, count]) => ({ hour, avgEngagement: count }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  return { bestDays, bestHours };
}

function computeContentPerformance(
  posts: InstagramPost[],
  ci: ContentInteractions | null,
  followerCount: number,
  insightsPeriod?: [Date, Date]
): ContentTypePerformance[] {
  // Filter helper: keep only posts within the insights period (if known)
  const inPeriod = (p: InstagramPost) =>
    !insightsPeriod ||
    (p.timestamp.getTime() >= insightsPeriod[0].getTime() &&
      p.timestamp.getTime() <= insightsPeriod[1].getTime());

  // If real insight data is available, use it to compute accurate per-type metrics
  if (ci) {
    const result: ContentTypePerformance[] = [];

    // Only count reels/posts published within the insights period — the interaction totals
    // in content_interactions.html cover that specific window, not all-time content.
    // Also exclude test reels (no caption) which never received engagement.
    const reels = posts.filter(
      (p) => p.mediaType === "REEL" && p.caption.trim().length > 0 && inPeriod(p)
    );
    const images = posts.filter(
      (p) => (p.mediaType === "IMAGE" || p.mediaType === "CAROUSEL") && inPeriod(p)
    );

    // Use likes+comments as fallback when the interactions field is missing/zero
    const reelEngagement = ci.reels.interactions || ci.reels.likes + ci.reels.comments;
    if (reels.length > 0 && reelEngagement > 0) {
      const count = reels.length;
      const avgLikes = ci.reels.likes / count;
      const avgComments = ci.reels.comments / count;
      result.push({
        type: "REEL",
        avgEngagement: reelEngagement / count,
        avgLikes,
        avgComments,
        count,
        engagementRate: followerCount > 0 ? (reelEngagement / count / followerCount) * 100 : 0,
      });
    }

    const postEngagement = ci.posts.interactions || ci.posts.likes + ci.posts.comments;
    if (images.length > 0 && postEngagement > 0) {
      const count = images.length;
      const avgLikes = ci.posts.likes / count;
      const avgComments = ci.posts.comments / count;
      result.push({
        type: "IMAGE",
        avgEngagement: postEngagement / count,
        avgLikes,
        avgComments,
        count,
        engagementRate: followerCount > 0 ? (postEngagement / count / followerCount) * 100 : 0,
      });
    }

    if (result.length > 0) return result;
  }

  // Fallback: compute from raw post data
  const byType = new Map<string, { likes: number[]; comments: number[]; count: number }>();

  for (const post of posts) {
    const t = post.mediaType;
    if (!byType.has(t)) byType.set(t, { likes: [], comments: [], count: 0 });
    const entry = byType.get(t)!;
    entry.likes.push(post.likes);
    entry.comments.push(post.comments);
    entry.count++;
  }

  return [...byType.entries()].map(([type, data]) => {
    const avgLikes = data.likes.reduce((a, b) => a + b, 0) / data.count;
    const avgComments = data.comments.reduce((a, b) => a + b, 0) / data.count;
    return {
      type: type as MediaType,
      avgEngagement: avgLikes + avgComments,
      avgLikes,
      avgComments,
      count: data.count,
      engagementRate: followerCount > 0 ? ((avgLikes + avgComments) / followerCount) * 100 : 0,
    };
  });
}

export function computeMetrics(
  followers: InstagramFollower[],
  following: InstagramFollower[],
  posts: InstagramPost[],
  audienceInsights: AudienceInsights | null,
  contentInteractions: ContentInteractions | null,
  reachInsights: ReachInsights | null
): InstagramMetrics {
  // Use real follower count from insights (more accurate than counting HTML link entries)
  const followerCount = audienceInsights?.followerCount ?? followers.length;

  // Derive per-post averages from real aggregate insight data when available
  let avgLikes: number;
  let avgComments: number;
  let engagementRate: number;
  let engagementRateWithReels: number | undefined;

  // Parse the insights period so we can restrict the denominator to posts published
  // during the same window that content_interactions.html covers. Older posts and
  // posts with no follower reach (no caption = test reels) are excluded.
  const insightsPeriodStr = contentInteractions?.period ?? audienceInsights?.period ?? "";
  const insightsPeriod = parseInsightPeriod(insightsPeriodStr) ?? undefined;

  const inPeriod = (p: InstagramPost) =>
    !insightsPeriod ||
    (p.timestamp.getTime() >= insightsPeriod[0].getTime() &&
      p.timestamp.getTime() <= insightsPeriod[1].getTime());

  if (contentInteractions && followerCount > 0) {
    // Real data path: use aggregated interactions from content_interactions.html.
    // ER is computed on IMAGE/CAROUSEL posts only — reels have a separate distribution
    // algorithm and would skew the metric for static content performance.
    const periodImagePosts = posts.filter(
      (p) => (p.mediaType === "IMAGE" || p.mediaType === "CAROUSEL") && inPeriod(p)
    );
    const postCount =
      periodImagePosts.length ||
      posts.filter((p) => p.mediaType === "IMAGE" || p.mediaType === "CAROUSEL").length;
    // Likes and comments from image/carousel posts only
    const realLikes = contentInteractions.posts.likes;
    const realComments = contentInteractions.posts.comments;
    avgLikes = postCount > 0 ? realLikes / postCount : 0;
    avgComments = postCount > 0 ? realComments / postCount : 0;
    // Per-post engagement rate: (avgLikes + avgComments) / followers × 100
    engagementRate = followerCount > 0 ? ((avgLikes + avgComments) / followerCount) * 100 : 0;
    // ER including reels — user can toggle this view in the dashboard
    const reelCount = posts.filter((p) => p.mediaType === "REEL" && inPeriod(p)).length;
    const totalCount = postCount + reelCount || 1;
    const totalLikes = contentInteractions.posts.likes + contentInteractions.reels.likes;
    const totalComments = contentInteractions.posts.comments + contentInteractions.reels.comments;
    engagementRateWithReels =
      Math.round(
        ((totalLikes / totalCount + totalComments / totalCount) / followerCount) * 100 * 100
      ) / 100;
  } else {
    // Fallback: compute from raw post data (only works if likes are populated)
    const totalLikes = posts.reduce((a, p) => a + p.likes, 0);
    const totalComments = posts.reduce((a, p) => a + p.comments, 0);
    avgLikes = posts.length > 0 ? totalLikes / posts.length : 0;
    avgComments = posts.length > 0 ? totalComments / posts.length : 0;
    engagementRate =
      followerCount > 0 && posts.length > 0 ? ((avgLikes + avgComments) / followerCount) * 100 : 0;
  }

  // Round to 2 decimal places for display
  engagementRate = Math.round(engagementRate * 100) / 100;

  // Avg reach: use real impressions data if available
  const avgReachPerPost =
    reachInsights && posts.length > 0
      ? Math.round(reachInsights.impressions / posts.length)
      : Math.round(avgLikes * 3.5);

  const followingUsernames = new Set(following.map((f) => f.username));
  const followerUsernames = new Set(followers.map((f) => f.username));
  const nonReciprocalCount = [...followingUsernames].filter(
    (u) => !followerUsernames.has(u)
  ).length;

  // Inactive follower estimation based on % of followers who never interacted
  // From content_interactions: nonFollowerInteractionPct tells us what % of interactions
  // came from non-followers. We estimate active followers from accountsInteracted.
  const followerInteractors = contentInteractions
    ? Math.round(
        contentInteractions.accountsInteracted *
          (1 - contentInteractions.nonFollowerInteractionPct / 100)
      )
    : 0;
  const inactiveCount = contentInteractions
    ? Math.max(0, followerCount - followerInteractors)
    : Math.round(followerCount * 0.75);
  const inactivePercentage = followerCount > 0 ? (inactiveCount / followerCount) * 100 : 75;

  // Follower growth rate: extract signed percentage from insight change string
  let followerGrowthRate = 0;
  if (audienceInsights?.followerCountChange) {
    const m = audienceInsights.followerCountChange.match(/(-?[\d.]+)%/);
    if (m) followerGrowthRate = parseFloat(m[1]);
  }

  const growthByMonth = computeFollowerGrowth(followers, audienceInsights?.followerCount);
  const { bestDays, bestHours } = computePostingTimes(posts);
  const contentPerf = computeContentPerformance(
    posts,
    contentInteractions,
    followerCount,
    insightsPeriod
  );

  // Per-post likes/comments are not available in the HTML export.
  // Sort by most recent timestamp as a meaningful fallback.
  const topPosts = [...posts]
    .filter((p) => p.mediaType !== "STORY")
    .sort((a, b) => {
      const engDiff = b.likes + b.comments - (a.likes + a.comments);
      if (engDiff !== 0) return engDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    })
    .slice(0, 10);

  return {
    engagementRate,
    engagementRateWithReels,
    avgLikesPerPost: avgLikes,
    avgCommentsPerPost: avgComments,
    avgReachPerPost,
    followerGrowthRate,
    followerGrowthByMonth: growthByMonth,
    bestPostingDays: bestDays,
    bestPostingHours: bestHours,
    contentTypePerformance: contentPerf,
    inactiveFollowersCount: inactiveCount,
    inactiveFollowersPercentage: inactivePercentage,
    nonReciprocalFollowsCount: nonReciprocalCount,
    topPosts,
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function parseInstagramExport(
  fromDate?: string,
  toDate?: string
): Promise<InstagramAnalytics | null> {
  const exportFolder = findExportFolder();
  if (!exportFolder) return null;

  const from = fromDate ? new Date(fromDate) : undefined;
  const to = toDate ? new Date(toDate) : undefined;

  // Detect JSON format and delegate to the JSON parser
  if (isJsonExport(exportFolder)) {
    return parseJsonExport(exportFolder, computeMetrics, from, to);
  }

  try {
    let followers = parseFollowers(exportFolder);
    let following = parseFollowing(exportFolder);
    let posts = parsePosts(exportFolder);

    // Apply date filters
    if (from) {
      posts = posts.filter((p) => p.timestamp >= from);
      followers = followers.filter((f) => f.followedAt >= from);
    }
    if (to) {
      posts = posts.filter((p) => p.timestamp <= to);
      followers = followers.filter((f) => f.followedAt <= to);
    }

    // Parse real insight data files
    const audienceInsights = parseAudienceInsights(exportFolder);
    const contentInteractions = parseContentInteractions(exportFolder);
    const reachInsights = parseReachInsights(exportFolder);

    // Mark mutual follows
    const followerSet = new Set(followers.map((f) => f.username));
    for (const f of following) {
      f.isFollowingBack = followerSet.has(f.username);
    }
    const followingSet = new Set(following.map((f) => f.username));
    for (const f of followers) {
      f.isFollowingBack = followingSet.has(f.username);
    }

    // Use real follower count for profile if insights are available
    const followerCount = audienceInsights?.followerCount ?? followers.length;
    const profile = parseProfile(exportFolder, followerCount, following.length, posts.length);

    const metrics = computeMetrics(
      followers,
      following,
      posts,
      audienceInsights,
      contentInteractions,
      reachInsights
    );

    return {
      profile,
      followers,
      following,
      posts,
      metrics,
      audienceInsights: audienceInsights ?? undefined,
      contentInteractions: contentInteractions ?? undefined,
      reachInsights: reachInsights ?? undefined,
      parsedAt: new Date(),
      dataSource: "export",
    };
  } catch (error) {
    console.error("Error parsing Instagram export:", error);
    return null;
  }
}
