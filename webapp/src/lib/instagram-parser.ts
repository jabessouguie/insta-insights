/**
 * Instagram Export Entry Point
 * Detects the local export folder and delegates to the JSON parser.
 * Only the JSON export format is supported (Instagram "Télécharger tes données" → JSON).
 */

import fs from "fs";
import path from "path";
import type {
  InstagramAnalytics,
  InstagramFollower,
  InstagramPost,
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

/** Return the first Instagram export folder found in data/ (also checks data/json/) */
export function findExportFolder(): string | null {
  const root = getDataRoot();
  if (!fs.existsSync(root)) return null;

  // Search directly under data/
  const entries = fs.readdirSync(root);
  const direct = entries.find((e) => {
    const full = path.join(root, e);
    return fs.statSync(full).isDirectory() && e.startsWith("instagram-");
  });
  if (direct) return path.join(root, direct);

  // Also check data/json/ subdirectory
  const jsonSubDir = path.join(root, "json");
  if (fs.existsSync(jsonSubDir)) {
    const subEntries = fs.readdirSync(jsonSubDir);
    const found = subEntries.find((e) => {
      const full = path.join(jsonSubDir, e);
      return fs.statSync(full).isDirectory() && e.startsWith("instagram-");
    });
    if (found) return path.join(jsonSubDir, found);
  }

  return null;
}

// ─── Insight period parser ───────────────────────────────────────────────────

/**
 * Parse the "Période" string from Instagram insight JSON files into a [start, end] Date pair.
 * Supports two formats:
 *   - "Nov 26 - Feb 23"        (month-day, no year)
 *   - "5 déc. 2024 – 28 févr. 2025"  (day-month-year, French or English)
 */
export function parseInsightPeriod(period: string): [Date, Date] | null {
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

      let endYear = currentYear;
      if (endMonth > currentMonth || (endMonth === currentMonth && endDay > currentDay)) {
        endYear = currentYear;
      }
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

// ─── Metrics computation ─────────────────────────────────────────────────────

function computeFollowerGrowth(
  followers: InstagramFollower[],
  realFollowerCount?: number
): FollowerGrowthPoint[] {
  const byMonth = new Map<string, number>();

  for (const f of followers) {
    if (f.followedAt.getTime() === 0) continue;
    const key = `${f.followedAt.getFullYear()}-${String(f.followedAt.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }

  const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

  // Offset cumulative base so the last point matches the real follower count
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
  const byDay = new Map<string, number>();
  const byHour = new Map<number, number>();

  const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  for (const post of posts) {
    if (post.mediaType === "STORY") continue;
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
  const inPeriod = (p: InstagramPost) =>
    !insightsPeriod ||
    (p.timestamp.getTime() >= insightsPeriod[0].getTime() &&
      p.timestamp.getTime() <= insightsPeriod[1].getTime());

  if (ci) {
    const result: ContentTypePerformance[] = [];

    const reels = posts.filter(
      (p) => p.mediaType === "REEL" && p.caption.trim().length > 0 && inPeriod(p)
    );
    const images = posts.filter(
      (p) => (p.mediaType === "IMAGE" || p.mediaType === "CAROUSEL") && inPeriod(p)
    );

    const reelEngagement = ci.reels.interactions || ci.reels.likes + ci.reels.comments;
    if (reels.length > 0 && reelEngagement > 0) {
      const count = reels.length;
      result.push({
        type: "REEL",
        avgEngagement: reelEngagement / count,
        avgLikes: ci.reels.likes / count,
        avgComments: ci.reels.comments / count,
        count,
        engagementRate: followerCount > 0 ? (reelEngagement / count / followerCount) * 100 : 0,
      });
    }

    const postEngagement = ci.posts.interactions || ci.posts.likes + ci.posts.comments;
    if (images.length > 0 && postEngagement > 0) {
      const count = images.length;
      result.push({
        type: "IMAGE",
        avgEngagement: postEngagement / count,
        avgLikes: ci.posts.likes / count,
        avgComments: ci.posts.comments / count,
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
  const followerCount = audienceInsights?.followerCount ?? followers.length;

  let avgLikes: number;
  let avgComments: number;
  let engagementRate: number;
  let engagementRateWithReels: number | undefined;

  const insightsPeriodStr = contentInteractions?.period ?? audienceInsights?.period ?? "";
  const insightsPeriod = parseInsightPeriod(insightsPeriodStr) ?? undefined;

  const inPeriod = (p: InstagramPost) =>
    !insightsPeriod ||
    (p.timestamp.getTime() >= insightsPeriod[0].getTime() &&
      p.timestamp.getTime() <= insightsPeriod[1].getTime());

  if (contentInteractions && followerCount > 0) {
    const periodImagePosts = posts.filter(
      (p) => (p.mediaType === "IMAGE" || p.mediaType === "CAROUSEL") && inPeriod(p)
    );
    const postCount =
      periodImagePosts.length ||
      posts.filter((p) => p.mediaType === "IMAGE" || p.mediaType === "CAROUSEL").length;
    avgLikes = postCount > 0 ? contentInteractions.posts.likes / postCount : 0;
    avgComments = postCount > 0 ? contentInteractions.posts.comments / postCount : 0;
    engagementRate = followerCount > 0 ? ((avgLikes + avgComments) / followerCount) * 100 : 0;

    const reelCount = posts.filter((p) => p.mediaType === "REEL" && inPeriod(p)).length;
    const totalCount = postCount + reelCount || 1;
    const totalLikes = contentInteractions.posts.likes + contentInteractions.reels.likes;
    const totalComments = contentInteractions.posts.comments + contentInteractions.reels.comments;
    engagementRateWithReels =
      Math.round(
        ((totalLikes / totalCount + totalComments / totalCount) / followerCount) * 100 * 100
      ) / 100;
  } else {
    const totalLikes = posts.reduce((a, p) => a + p.likes, 0);
    const totalComments = posts.reduce((a, p) => a + p.comments, 0);
    avgLikes = posts.length > 0 ? totalLikes / posts.length : 0;
    avgComments = posts.length > 0 ? totalComments / posts.length : 0;
    engagementRate =
      followerCount > 0 && posts.length > 0 ? ((avgLikes + avgComments) / followerCount) * 100 : 0;
  }

  engagementRate = Math.round(engagementRate * 100) / 100;

  const avgReachPerPost =
    reachInsights && posts.length > 0
      ? Math.round(reachInsights.impressions / posts.length)
      : Math.round(avgLikes * 3.5);

  const followingUsernames = new Set(following.map((f) => f.username));
  const followerUsernames = new Set(followers.map((f) => f.username));
  const nonReciprocalCount = [...followingUsernames].filter(
    (u) => !followerUsernames.has(u)
  ).length;

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

/**
 * Find the local Instagram export folder and parse it.
 * Only the JSON export format is supported.
 * Returns null when no export folder is found or the format is not JSON.
 */
export async function parseInstagramExport(
  fromDate?: string,
  toDate?: string
): Promise<InstagramAnalytics | null> {
  const exportFolder = findExportFolder();
  if (!exportFolder) return null;

  if (!isJsonExport(exportFolder)) {
    console.warn(
      "[instagram-parser] HTML export detected — only JSON format is supported. " +
        "Please re-download your Instagram data and select JSON format."
    );
    return null;
  }

  const from = fromDate ? new Date(fromDate) : undefined;
  const to = toDate ? new Date(toDate) : undefined;

  return parseJsonExport(exportFolder, computeMetrics, from, to);
}
