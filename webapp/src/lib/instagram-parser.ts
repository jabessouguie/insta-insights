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

// ─── Path helpers ────────────────────────────────────────────────────────────

function getDataRoot(): string {
  const env = process.env.INSTAGRAM_DATA_PATH;
  if (env) return env;
  // webapp/ is one level below the repo root; data/ is at repo root
  return path.join(process.cwd(), "..", "data");
}

/** Return the first Instagram export folder found in data/ */
function findExportFolder(): string | null {
  const root = getDataRoot();
  if (!fs.existsSync(root)) return null;

  const entries = fs.readdirSync(root);
  const folder = entries.find((e) => {
    const full = path.join(root, e);
    return fs.statSync(full).isDirectory() && e.startsWith("instagram-");
  });

  return folder ? path.join(root, folder) : null;
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
    const $clone = $td.clone();
    $clone.find("*").remove();
    const label = $clone.text().trim();

    // Value = innermost div text
    const value = $td.find("div > div").first().text().trim();

    if (label && value) map.set(label, value);
  });

  return map;
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

function parseContentInteractions(exportFolder: string): ContentInteractions | null {
  const map = parseInsightTable(
    exportFolder,
    "logged_information/past_instagram_insights/content_interactions.html"
  );
  if (!map.size) return null;

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

function parsePosts(exportFolder: string): InstagramPost[] {
  const mediaDir = path.join(exportFolder, "your_instagram_activity", "media");
  const result: InstagramPost[] = [];

  const typeMap: Array<[string, MediaType]> = [
    ["posts_1.html", "IMAGE"],
    ["posts_2.html", "CAROUSEL"],
    ["reels.html", "REEL"],
    ["stories.html", "STORY"],
  ];

  for (const [file, type] of typeMap) {
    result.push(...parsePostsFile(path.join(mediaDir, file), type));
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

function computeFollowerGrowth(followers: InstagramFollower[]): FollowerGrowthPoint[] {
  const byMonth = new Map<string, number>();

  for (const f of followers) {
    // Skip entries with no reliable timestamp (epoch = parse failure fallback)
    if (f.followedAt.getTime() === 0) continue;
    const key = `${f.followedAt.getFullYear()}-${String(f.followedAt.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }

  const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  let cumulative = 0;
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
  followerCount: number
): ContentTypePerformance[] {
  // If real insight data is available, use it to compute accurate per-type metrics
  if (ci) {
    const result: ContentTypePerformance[] = [];

    const reels = posts.filter((p) => p.mediaType === "REEL");
    const images = posts.filter((p) => p.mediaType === "IMAGE" || p.mediaType === "CAROUSEL");

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

    const storyEngagement = ci.stories.interactions || ci.stories.replies;
    if (storyEngagement > 0) {
      const storyCount = posts.filter((p) => p.mediaType === "STORY").length || 1;
      result.push({
        type: "STORY",
        avgEngagement: storyEngagement / storyCount,
        avgLikes: 0,
        avgComments: ci.stories.replies / storyCount,
        count: storyCount,
        engagementRate:
          followerCount > 0 ? (storyEngagement / storyCount / followerCount) * 100 : 0,
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

function computeMetrics(
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

  if (contentInteractions && followerCount > 0) {
    // Real data path: use aggregated interactions from content_interactions.html
    const postCount = posts.filter((p) => p.mediaType !== "STORY").length || posts.length;
    // Total likes and comments across posts + reels
    const realLikes = contentInteractions.posts.likes + contentInteractions.reels.likes;
    const realComments = contentInteractions.posts.comments + contentInteractions.reels.comments;
    avgLikes = postCount > 0 ? realLikes / postCount : 0;
    avgComments = postCount > 0 ? realComments / postCount : 0;
    // Per-post engagement rate: (avgLikes + avgComments) / followers × 100
    // This is the standard influencer-marketing ER metric
    engagementRate = followerCount > 0 ? ((avgLikes + avgComments) / followerCount) * 100 : 0;
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

  const growthByMonth = computeFollowerGrowth(followers);
  const { bestDays, bestHours } = computePostingTimes(posts);
  const contentPerf = computeContentPerformance(posts, contentInteractions, followerCount);

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

export async function parseInstagramExport(): Promise<InstagramAnalytics | null> {
  const exportFolder = findExportFolder();
  if (!exportFolder) return null;

  try {
    const followers = parseFollowers(exportFolder);
    const following = parseFollowing(exportFolder);
    const posts = parsePosts(exportFolder);

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
