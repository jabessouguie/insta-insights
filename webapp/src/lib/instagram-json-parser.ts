/**
 * Instagram JSON Export Parser
 * Parses the JSON files from Instagram's "Download Your Data" export (JSON format).
 * The JSON format uses string_map_data objects with French labels as keys.
 * Handles the mojibake encoding (UTF-8 bytes stored as Latin-1 code points).
 */

import fs from "fs";
import path from "path";
import type {
  InstagramAnalytics,
  InstagramFollower,
  InstagramPost,
  InstagramProfile,
  InstagramMetrics,
  MediaType,
  AudienceInsights,
  ContentInteractions,
  ReachInsights,
} from "@/types/instagram";

// ─── Encoding helper ────────────────────────────────────────────────────────

/** Fix Instagram JSON mojibake: UTF-8 bytes stored as Latin-1 code points */
function fixMojibake(s: string): string {
  try {
    // Convert each char code to a byte, then decode as UTF-8
    const bytes = new Uint8Array(s.split("").map((c) => c.charCodeAt(0)));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return s;
  }
}

// ─── JSON file helpers ──────────────────────────────────────────────────────

function readJson(filePath: string): unknown {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

interface StringMapEntry {
  href: string;
  value: string;
  timestamp: number;
}

/**
 * Extract string_map_data from a JSON insight file into a simple key→value Map.
 * This mirrors what parseInsightTable does for HTML files.
 * The JSON structure is: { rootKey: [{ string_map_data: { label: { value, ... } } }] }
 */
function extractStringMap(data: unknown): Map<string, string> {
  const map = new Map<string, string>();
  if (!data || typeof data !== "object") return map;

  // Find the first array value in the root object
  const root = data as Record<string, unknown>;
  for (const key of Object.keys(root)) {
    const arr = root[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const smd = (item as Record<string, unknown>).string_map_data;
      if (!smd || typeof smd !== "object") continue;
      for (const [rawLabel, entry] of Object.entries(smd as Record<string, StringMapEntry>)) {
        const label = fixMojibake(rawLabel)
          .replace(/\u2019/g, "'") // typographic apostrophe
          .replace(/\u00a0/g, " "); // non-breaking space
        const value = entry?.value != null ? fixMojibake(String(entry.value)) : "";
        if (label && value) map.set(label, value);
      }
    }
  }
  return map;
}

/** Parse a number string like "3,835" or "400274" */
function parseNum(s: string): number {
  return parseInt(s.replace(/[,\s]/g, ""), 10) || 0;
}

/** Extract the first float from a string like "2.9%" or "-43.7% vs..." */
function parsePct(s: string): number {
  const m = s.match(/(-?[\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/** Parse "Key: val%, Key2: val2%" string into a Record */
function parseKVPcts(s: string): Record<string, number> {
  const result: Record<string, number> = {};
  const re = /([^,:%]+):\s*([\d.]+)%?/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const key = m[1].trim();
    const val = parseFloat(m[2]);
    if (key) result[key] = val;
  }
  return result;
}

// ─── Format detection ───────────────────────────────────────────────────────

/** Check if an export folder is JSON format (has .json files instead of .html) */
export function isJsonExport(exportFolder: string): boolean {
  const piFile = path.join(
    exportFolder,
    "personal_information",
    "personal_information",
    "personal_information.json"
  );
  if (fs.existsSync(piFile)) return true;

  // Also check for JSON insights
  const insightFile = path.join(
    exportFolder,
    "logged_information",
    "past_instagram_insights",
    "audience_insights.json"
  );
  return fs.existsSync(insightFile);
}

// ─── Profile ────────────────────────────────────────────────────────────────

function parseProfile(
  exportFolder: string,
  followerCount: number,
  followingCount: number,
  postCount: number
): InstagramProfile {
  const piFile = path.join(
    exportFolder,
    "personal_information",
    "personal_information",
    "personal_information.json"
  );
  const data = readJson(piFile) as Record<string, unknown> | null;

  let username = "unknown";
  let fullName = "";
  let bio = "";
  let website = "";

  if (data) {
    // Structure: { profile_user: [{ string_map_data: { "Nom de profil": { value }, ... } }] }
    const map = extractStringMap(data);
    username =
      map.get("Nom de profil") || map.get("Profile name") || map.get("Username") || "unknown";
    fullName = map.get("Nom") || map.get("Name") || "";
    bio = map.get("Bio") || map.get("Biographie") || "";
    website = map.get("Site web") || map.get("Website") || "";
  }

  // Fallback: extract username from folder name
  const folderName = path.basename(exportFolder);
  const match = folderName.match(/instagram-([^-]+)-/);
  if (match && username === "unknown") username = match[1];

  return {
    username,
    fullName: fullName || username,
    bio,
    website,
    followerCount,
    followingCount,
    postCount,
    profilePicUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
    isVerified: false,
  };
}

// ─── Followers & Following ──────────────────────────────────────────────────

function parseFollowersJson(exportFolder: string): InstagramFollower[] {
  const dir = path.join(exportFolder, "connections", "followers_and_following");
  if (!fs.existsSync(dir)) return [];

  const result: InstagramFollower[] = [];
  const files = fs.readdirSync(dir).filter((f) => f.startsWith("followers") && f.endsWith(".json"));

  for (const file of files) {
    const data = readJson(path.join(dir, file));
    if (!Array.isArray(data)) continue;

    for (const entry of data) {
      const sld = (entry as Record<string, unknown>).string_list_data;
      if (!Array.isArray(sld)) continue;
      for (const item of sld) {
        const { value, timestamp } = item as { value?: string; timestamp?: number };
        if (!value) continue;
        result.push({
          username: value.toLowerCase(),
          followedAt: timestamp ? new Date(timestamp * 1000) : new Date(0),
          isFollowingBack: false,
          isActive: false,
        });
      }
    }
  }
  return result;
}

function parseFollowingJson(exportFolder: string): InstagramFollower[] {
  const dir = path.join(exportFolder, "connections", "followers_and_following");
  if (!fs.existsSync(dir)) return [];

  const result: InstagramFollower[] = [];
  const files = ["following.json", "following_hashtags.json"];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = readJson(filePath);
    if (!data || typeof data !== "object") continue;

    // JSON following format: { relationships_following: [...] }
    const root = data as Record<string, unknown>;
    for (const key of Object.keys(root)) {
      const arr = root[key];
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        const sld = (entry as Record<string, unknown>).string_list_data;
        if (!Array.isArray(sld)) continue;
        for (const item of sld) {
          const { value, timestamp } = item as { value?: string; timestamp?: number };
          if (!value) continue;
          result.push({
            username: value.toLowerCase(),
            followedAt: timestamp ? new Date(timestamp * 1000) : new Date(0),
            isFollowingBack: false,
            isActive: false,
          });
        }
      }
    }
  }
  return result;
}

// ─── Posts ───────────────────────────────────────────────────────────────────

function parsePostsJson(exportFolder: string): InstagramPost[] {
  const mediaDir = path.join(exportFolder, "your_instagram_activity", "media");
  if (!fs.existsSync(mediaDir)) return [];

  const result: InstagramPost[] = [];
  let idx = 0;

  // posts_1.json, posts_2.json, ...
  const postFiles = fs.existsSync(mediaDir)
    ? fs.readdirSync(mediaDir).filter((f) => f.startsWith("posts_") && f.endsWith(".json"))
    : [];

  for (const file of postFiles) {
    const data = readJson(path.join(mediaDir, file));
    if (!Array.isArray(data)) continue;

    for (const entry of data) {
      const mediaArr = (entry as Record<string, unknown>).media;
      const caption = (entry as Record<string, unknown>).title as string | undefined;

      if (Array.isArray(mediaArr)) {
        // Multi-media post (carousel) — use first media's timestamp
        const first = mediaArr[0] as Record<string, unknown> | undefined;
        const ts = (first?.creation_timestamp as number) || 0;
        const title = (first?.title as string) || caption || "";
        const mediaType: MediaType = mediaArr.length > 1 ? "CAROUSEL" : "IMAGE";

        result.push({
          id: `post_${idx++}`,
          timestamp: new Date(ts * 1000),
          caption: fixMojibake(title),
          mediaType,
          likes: 0,
          comments: 0,
          shares: 0,
          reach: 0,
          impressions: 0,
          savedCount: 0,
        });
      }
    }
  }

  // Reels
  const reelsFile = path.join(mediaDir, "reels.json");
  const reelsData = readJson(reelsFile) as Record<string, unknown> | null;
  if (reelsData) {
    for (const key of Object.keys(reelsData)) {
      const arr = reelsData[key];
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        const mediaArr = (entry as Record<string, unknown>).media;
        if (Array.isArray(mediaArr)) {
          for (const media of mediaArr) {
            const m = media as Record<string, unknown>;
            result.push({
              id: `reel_${idx++}`,
              timestamp: new Date(((m.creation_timestamp as number) || 0) * 1000),
              caption: fixMojibake((m.title as string) || ""),
              mediaType: "REEL",
              likes: 0,
              comments: 0,
              shares: 0,
              reach: 0,
              impressions: 0,
              savedCount: 0,
            });
          }
        }
      }
    }
  }

  // Stories
  const storiesFile = path.join(mediaDir, "stories.json");
  const storiesData = readJson(storiesFile) as Record<string, unknown> | null;
  if (storiesData) {
    for (const key of Object.keys(storiesData)) {
      const arr = storiesData[key];
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        const m = entry as Record<string, unknown>;
        result.push({
          id: `story_${idx++}`,
          timestamp: new Date(((m.creation_timestamp as number) || 0) * 1000),
          caption: fixMojibake((m.title as string) || ""),
          mediaType: "STORY",
          likes: 0,
          comments: 0,
          shares: 0,
          reach: 0,
          impressions: 0,
          savedCount: 0,
        });
      }
    }
  }

  return result;
}

/**
 * Enrich posts with per-post insights from the insights/posts.json file.
 * The insights file contains likes, comments, impressions, reach, saves per post.
 */
function enrichPostsWithInsights(exportFolder: string, posts: InstagramPost[]): void {
  const insightsFile = path.join(
    exportFolder,
    "logged_information",
    "past_instagram_insights",
    "posts.json"
  );
  const data = readJson(insightsFile) as Record<string, unknown> | null;
  if (!data) return;

  // Build a map of timestamp → insight data
  const insightsByTs = new Map<number, Map<string, string>>();

  for (const key of Object.keys(data)) {
    const arr = data[key];
    if (!Array.isArray(arr)) continue;

    for (const entry of arr) {
      const smd = (entry as Record<string, unknown>).string_map_data;
      const mmd = (entry as Record<string, unknown>).media_map_data;
      if (!smd || typeof smd !== "object") continue;

      // Get timestamp from string_map_data
      const tsEntry =
        (smd as Record<string, StringMapEntry>)["Timestamp de la création"] ||
        (smd as Record<string, StringMapEntry>)["Creation timestamp"];
      const ts = tsEntry?.timestamp;
      if (!ts) continue;

      // Also try to get timestamp from media_map_data
      let mediaTs = ts;
      if (mmd && typeof mmd === "object") {
        for (const mediaEntry of Object.values(mmd as Record<string, Record<string, unknown>>)) {
          if (mediaEntry?.creation_timestamp) {
            mediaTs = mediaEntry.creation_timestamp as number;
            break;
          }
        }
      }

      const map = new Map<string, string>();
      for (const [rawLabel, entry2] of Object.entries(smd as Record<string, StringMapEntry>)) {
        const label = fixMojibake(rawLabel)
          .replace(/\u2019/g, "'")
          .replace(/\u00a0/g, " ");
        const value = entry2?.value != null ? String(entry2.value) : "";
        map.set(label, value);
      }

      insightsByTs.set(mediaTs || ts, map);
    }
  }

  // Match posts to insights by timestamp
  for (const post of posts) {
    const ts = Math.floor(post.timestamp.getTime() / 1000);
    const insight = insightsByTs.get(ts);
    if (!insight) continue;

    const likes = insight.get("J'aime") || insight.get("Likes") || "0";
    const comments = insight.get("Commentaires") || insight.get("Comments") || "0";
    const saves = insight.get("Enregistrements") || insight.get("Saves") || "0";
    const reach = insight.get("Comptes touchés") || insight.get("Accounts reached") || "0";
    const impressions = insight.get("Impressions") || "0";

    post.likes = parseNum(likes === "--" ? "0" : likes);
    post.comments = parseNum(comments === "--" ? "0" : comments);
    post.savedCount = parseNum(saves === "--" ? "0" : saves);
    post.reach = parseNum(reach === "--" ? "0" : reach);
    post.impressions = parseNum(impressions === "--" ? "0" : impressions);
  }
}

// ─── Audience Insights ──────────────────────────────────────────────────────

function parseAudienceInsightsJson(exportFolder: string): AudienceInsights | null {
  const filePath = path.join(
    exportFolder,
    "logged_information",
    "past_instagram_insights",
    "audience_insights.json"
  );
  const data = readJson(filePath);
  if (!data) return null;

  const map = extractStringMap(data);
  if (!map.size) return null;

  const dailyActivity: Record<string, number> = {};
  for (const [key, val] of map.entries()) {
    if (key.startsWith("Activité des followers")) {
      const day = key.replace(/Activité des followers\s*:\s*/, "").trim();
      dailyActivity[day] = parseNum(val);
    }
  }

  return {
    period: map.get("Période") || map.get("Period") || "",
    followerCount: parseNum(map.get("Followers") || "0"),
    followerCountChange: map.get("Nombre de followers") || map.get("Follower count") || "",
    followersGained: parseNum(map.get("Followers en plus") || map.get("Followers gained") || "0"),
    followersLost: parseNum(map.get("Followers en moins") || map.get("Followers lost") || "0"),
    netFollowerChange: parseNum(
      map.get("Total des followers") || map.get("Total followers") || "0"
    ),
    topCities: parseKVPcts(
      map.get("Pourcentage de followers en fonction de la ville") ||
      map.get("Follower percentage by city") ||
      ""
    ),
    topCountries: parseKVPcts(
      map.get("Pourcentage de followers en fonction du pays") ||
      map.get("Follower percentage by country") ||
      ""
    ),
    ageGroups: parseKVPcts(
      map.get("Pourcentage de followers en fonction de l'âge pour tous les genres") ||
      map.get("Follower percentage by age for all genders") ||
      ""
    ),
    genderSplit: {
      male: parsePct(
        map.get("Pourcentage du total des followers hommes") ||
        map.get("Male follower percentage") ||
        "0"
      ),
      female: parsePct(
        map.get("Pourcentage du total des de followers femmes") ||
        map.get("Female follower percentage") ||
        "0"
      ),
    },
    dailyActivity,
  };
}

// ─── Content Interactions ───────────────────────────────────────────────────

/**
 * Count items in a JSON array file without fully parsing it, by reading only
 * the root array under `rootKey`. Returns 0 if file doesn't exist or is empty.
 */
function countJsonArrayEntries(filePath: string, rootKey: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const data = readJson(filePath) as Record<string, unknown> | null;
  if (!data) return 0;
  const arr = data[rootKey];
  return Array.isArray(arr) ? arr.length : 0;
}

/**
 * Fallback: derive ContentInteractions from messages and story_interactions
 * when the official content_interactions.json is missing.
 *
 * Sources:
 * - messages/inbox/         → unique DM conversation threads (bidirectional)
 * - messages/message_requests/ → inbound DMs from non-followers
 * - story_interactions/story_likes.json → story likes received
 * - story_interactions/polls.json       → poll responses received
 * - story_interactions/questions.json   → Q&A responses received
 * - story_interactions/emoji_sliders.json + quizzes.json → additional story interactions
 */
function deriveInteractionsFromActivity(exportFolder: string): ContentInteractions | null {
  const activityDir = path.join(exportFolder, "your_instagram_activity");

  // ── DM conversations ──────────────────────────────────────────────────────
  const countDirs = (dir: string) => {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter((f) => {
      try {
        return fs.statSync(path.join(dir, f)).isDirectory();
      } catch {
        return false;
      }
    }).length;
  };

  const inboxCount = countDirs(path.join(activityDir, "messages", "inbox"));
  const requestsCount = countDirs(path.join(activityDir, "messages", "message_requests"));
  const totalDmAccounts = inboxCount + requestsCount;

  // ── Story interactions ────────────────────────────────────────────────────
  const siDir = path.join(activityDir, "story_interactions");

  const storyLikes = countJsonArrayEntries(
    path.join(siDir, "story_likes.json"),
    "story_activities_story_likes"
  );
  const storyPolls = countJsonArrayEntries(
    path.join(siDir, "polls.json"),
    "story_activities_polls"
  );
  const storyQuestions = countJsonArrayEntries(
    path.join(siDir, "questions.json"),
    "story_activities_questions"
  );
  const storySliders = countJsonArrayEntries(
    path.join(siDir, "emoji_sliders.json"),
    "story_activities_emoji_sliders"
  );
  const storyQuizzes = countJsonArrayEntries(
    path.join(siDir, "quizzes.json"),
    "story_activities_quizzes"
  );

  // story replies = all non-like story interactions (polls + Q&As + sliders + quizzes)
  const storyReplies = storyPolls + storyQuestions + storySliders + storyQuizzes;
  const storyInteractions = storyLikes + storyReplies;

  if (totalDmAccounts === 0 && storyInteractions === 0) return null;

  // Non-follower % ≈ message_requests / total DMs
  // (message_requests are always from non-followers by Instagram's definition)
  const nonFollowerPct =
    totalDmAccounts > 0 ? Math.round((requestsCount / totalDmAccounts) * 100) : 0;

  return {
    period: "", // cumulative — no period metadata in these sources
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

function parseContentInteractionsJson(exportFolder: string): ContentInteractions | null {
  const filePath = path.join(
    exportFolder,
    "logged_information",
    "past_instagram_insights",
    "content_interactions.json"
  );
  const data = readJson(filePath);
  if (data) {
    const map = extractStringMap(data);
    if (map.size) {
      const interactionPcts = parseKVPcts(
        map.get("Comptes ayant interagi par type de followers") || ""
      );
      const nonFollowerPct = interactionPcts["Non-followers"] ?? 0;

      return {
        period: map.get("Période") || map.get("Period") || "",
        totalInteractions: parseNum(
          map.get("Interactions avec le contenu") || map.get("Content interactions") || "0"
        ),
        totalInteractionsChange: map.get("Nombre d'interactions avec le contenu") || "",
        posts: {
          interactions: parseNum(map.get("Interactions avec les publications") || "0"),
          likes: parseNum(map.get("Mentions J'aime des publications") || "0"),
          comments: parseNum(map.get("Commentaires sur les publications") || "0"),
          shares: parseNum(map.get("Partages de publications") || "0"),
          saves: parseNum(map.get("Enregistrements de publications") || "0"),
        },
        stories: {
          interactions: parseNum(map.get("Interactions avec la story") || "0"),
          replies: parseNum(map.get("Réponses aux stories") || "0"),
        },
        reels: {
          interactions: parseNum(map.get("Interactions avec les reels") || "0"),
          likes: parseNum(map.get("Mentions J'aime sur les reels") || "0"),
          comments: parseNum(map.get("Commentaires sur les reels") || "0"),
          shares: parseNum(map.get("Partages des reels") || "0"),
          saves: parseNum(map.get("Enregistrements de reels") || "0"),
        },
        accountsInteracted: parseNum(map.get("Comptes ayant interagi") || "0"),
        accountsInteractedChange: map.get("Nombre de comptes ayant interagi") || "",
        nonFollowerInteractionPct: nonFollowerPct,
      };
    }
  }

  // Fallback: derive from messages DMs + story interactions
  return deriveInteractionsFromActivity(exportFolder);
}

// ─── Reach Insights ─────────────────────────────────────────────────────────

function parseReachInsightsJson(exportFolder: string): ReachInsights | null {
  const filePath = path.join(
    exportFolder,
    "logged_information",
    "past_instagram_insights",
    "profiles_reached.json"
  );
  const data = readJson(filePath);
  if (!data) return null;

  const map = extractStringMap(data);
  if (!map.size) return null;

  return {
    period: map.get("Période") || map.get("Period") || "",
    accountsReached: parseNum(map.get("Comptes touchés") || map.get("Accounts reached") || "0"),
    accountsReachedChange: map.get("Nombre de comptes touchés") || "",
    followerReachPct: parsePct(map.get("Followers") || "0"),
    nonFollowerReachPct: parsePct(map.get("Non-followers") || "0"),
    impressions: parseNum(map.get("Impressions") || "0"),
    impressionsChange: map.get("Nombre d'impressions") || "",
    profileVisits: parseNum(map.get("Visites du profil") || map.get("Profile visits") || "0"),
    profileVisitsChange: map.get("Nombre de visites sur le profil") || "",
    externalLinkTaps: parseNum(map.get("Appuis sur les liens externes") || "0"),
  };
}

// ─── Main entry point ───────────────────────────────────────────────────────

type ComputeMetricsFn = (
  followers: InstagramFollower[],
  following: InstagramFollower[],
  posts: InstagramPost[],
  audienceInsights: AudienceInsights | null,
  contentInteractions: ContentInteractions | null,
  reachInsights: ReachInsights | null
) => InstagramMetrics;

export function parseJsonExport(
  exportFolder: string,
  computeMetrics: ComputeMetricsFn,
  from?: Date,
  to?: Date
): InstagramAnalytics | null {
  try {
    let followers = parseFollowersJson(exportFolder);
    const following = parseFollowingJson(exportFolder);
    let posts = parsePostsJson(exportFolder);

    // Filter by date
    if (from) {
      posts = posts.filter((p) => p.timestamp >= from);
      followers = followers.filter((f) => f.followedAt >= from);
    }
    if (to) {
      posts = posts.filter((p) => p.timestamp <= to);
      followers = followers.filter((f) => f.followedAt <= to);
    }

    // Enrich posts with per-post insights (likes, comments, etc.)
    enrichPostsWithInsights(exportFolder, posts);

    const audienceInsights = parseAudienceInsightsJson(exportFolder);
    const contentInteractions = parseContentInteractionsJson(exportFolder);
    const reachInsights = parseReachInsightsJson(exportFolder);

    // Mark mutual follows
    const followerSet = new Set(followers.map((f) => f.username));
    for (const f of following) {
      f.isFollowingBack = followerSet.has(f.username);
    }
    const followingSet = new Set(following.map((f) => f.username));
    for (const f of followers) {
      f.isFollowingBack = followingSet.has(f.username);
    }

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
    console.error("Error parsing Instagram JSON export:", error);
    return null;
  }
}
