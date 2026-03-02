/**
 * Instagram Graph API Client
 * Maps Graph API responses → InstagramAnalytics (same shape as export parser).
 *
 * Required permissions:
 *   instagram_basic              — profile + media list
 *   instagram_manage_insights    — per-post + account-level insights
 *   instagram_manage_comments    — individual comment text
 */

import type {
  InstagramAnalytics,
  InstagramProfile,
  InstagramPost,
  InstagramMetrics,
  AudienceInsights,
  ContentInteractions,
  ReachInsights,
  RawComment,
} from "@/types/instagram";

const BASE = "https://graph.facebook.com/v22.0";

// ─── Simple in-process cache (5 min TTL) ──────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const _cache = new Map<string, CacheEntry<unknown>>();

function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.data);
  return fn().then((data) => {
    _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  });
}

// ─── Graph API fetch helper ────────────────────────────────────────────────────

async function gFetch<T>(
  path: string,
  token: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? `Graph API error ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

// ─── Raw Graph API response shapes ────────────────────────────────────────────

interface GMedia {
  id: string;
  timestamp: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL";
  like_count?: number;
  comments_count?: number;
  thumbnail_url?: string;
}

interface GInsightsValue {
  value: number;
}

interface GInsight {
  name: string;
  values?: GInsightsValue[];
  value?: number;
}

interface GMediaInsights {
  data: GInsight[];
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class InstagramGraphAPI {
  constructor(
    private readonly token: string,
    private readonly accountId: string
  ) {}

  /** Validate the token with a lightweight account call. Returns display name or throws.
   *  We request `id,name` only — the `username` field is deprecated for Facebook
   *  User/Page objects (error #12) and must not be included here. */
  async validateToken(): Promise<string> {
    const res = await gFetch<{ id?: string; name?: string }>(`/${this.accountId}`, this.token, {
      fields: "id,name",
    });
    if (!res.id)
      throw new Error("Unable to verify account — check your Instagram Business Account ID");
    return res.name ?? res.id;
  }

  async getProfile(): Promise<InstagramProfile> {
    return cached(`profile-${this.accountId}`, 5 * 60_000, async () => {
      const res = await gFetch<{
        id: string;
        username: string;
        name?: string;
        biography?: string;
        website?: string;
        followers_count?: number;
        follows_count?: number;
        media_count?: number;
        profile_picture_url?: string;
      }>(`/${this.accountId}`, this.token, {
        fields:
          "id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url",
      });

      return {
        username: res.username ?? res.name ?? res.id ?? "unknown",
        fullName: res.name ?? res.username ?? res.id ?? "unknown",
        bio: res.biography ?? "",
        website: res.website ?? "",
        followerCount: res.followers_count ?? 0,
        followingCount: res.follows_count ?? 0,
        postCount: res.media_count ?? 0,
        profilePicUrl: res.profile_picture_url ?? "",
        isVerified: false,
      };
    });
  }

  async getMedia(limit = 100): Promise<GMedia[]> {
    return cached(`media-${this.accountId}-${limit}`, 5 * 60_000, async () => {
      const res = await gFetch<{ data: GMedia[] }>(`/${this.accountId}/media`, this.token, {
        fields: "id,timestamp,caption,media_type,like_count,comments_count,thumbnail_url",
        limit: String(limit),
      });
      return res.data ?? [];
    });
  }

  /** Fetch per-media insights (reach, impressions, saved, shares). For REELs also fetches watch time. */
  private async getMediaInsights(mediaId: string, isReel = false): Promise<Record<string, number>> {
    try {
      const metric = isReel
        ? "reach,impressions,saved,shares,likes,ig_reels_avg_watch_time,video_views"
        : "reach,impressions,saved,shares,likes";
      const res = await gFetch<GMediaInsights>(`/${mediaId}/insights`, this.token, { metric });
      const out: Record<string, number> = {};
      for (const item of res.data ?? []) {
        out[item.name] = item.value ?? item.values?.[0]?.value ?? 0;
      }
      return out;
    } catch {
      return {};
    }
  }

  /** Fetch individual comments for a media object (up to 100). */
  async getMediaComments(mediaId: string): Promise<RawComment[]> {
    try {
      const res = await gFetch<{ data: RawComment[] }>(`/${mediaId}/comments`, this.token, {
        fields: "id,text,timestamp,username",
        limit: "100",
      });
      return res.data ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Collect up to 200 comments from the top 50 most-commented posts.
   * Stays well within the 200 req/hour rate limit.
   */
  async getAllComments(media: GMedia[]): Promise<RawComment[]> {
    const sorted = [...media]
      .filter((m) => (m.comments_count ?? 0) > 0)
      .sort((a, b) => (b.comments_count ?? 0) - (a.comments_count ?? 0))
      .slice(0, 50);

    const batches = await Promise.all(sorted.map((m) => this.getMediaComments(m.id)));
    return batches.flat().slice(0, 500);
  }

  /** Account-level insights (reach, impressions, profile views). */
  private async getAccountInsights(
    sinceTs?: number,
    untilTs?: number
  ): Promise<{
    reach: number;
    impressions: number;
    profileViews: number;
  }> {
    try {
      const since = sinceTs ?? Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
      const until = untilTs ?? Math.floor(Date.now() / 1000);
      const res = await gFetch<{ data: GInsight[] }>(`/${this.accountId}/insights`, this.token, {
        metric: "reach,impressions,profile_views",
        period: "day",
        since: String(since),
        until: String(until),
      });
      const sum = (name: string) =>
        (res.data ?? []).find((i) => i.name === name)?.values?.reduce((s, v) => s + v.value, 0) ??
        0;

      return {
        reach: sum("reach"),
        impressions: sum("impressions"),
        profileViews: sum("profile_views"),
      };
    } catch {
      return { reach: 0, impressions: 0, profileViews: 0 };
    }
  }

  /** Audience demographic insights (country, city, age/gender). */
  private async getAudienceDemographics(): Promise<Partial<AudienceInsights>> {
    try {
      const res = await gFetch<{
        data: Array<{
          name: string;
          values: Array<{ value: Record<string, number> }>;
        }>;
      }>(`/${this.accountId}/insights`, this.token, {
        metric: "audience_country,audience_city,audience_gender_age",
        period: "lifetime",
      });

      const findValues = (name: string) =>
        res.data?.find((d) => d.name === name)?.values?.[0]?.value ?? {};

      const genderAge = findValues("audience_gender_age");
      let male = 0,
        female = 0,
        total = 0;
      const ageGroups: Record<string, number> = {};
      for (const [key, count] of Object.entries(genderAge)) {
        const [gender, age] = key.split(".");
        total += count;
        if (gender === "M") male += count;
        if (gender === "F") female += count;
        ageGroups[age] = (ageGroups[age] ?? 0) + count;
      }
      // Convert age groups to percentages
      if (total > 0) {
        for (const k of Object.keys(ageGroups))
          ageGroups[k] = Math.round((ageGroups[k] / total) * 100);
      }

      return {
        topCountries: findValues("audience_country"),
        topCities: findValues("audience_city"),
        ageGroups,
        genderSplit: {
          male: total > 0 ? Math.round((male / total) * 100) : 50,
          female: total > 0 ? Math.round((female / total) * 100) : 50,
        },
        dailyActivity: {},
        period: "30 derniers jours",
        followerCount: 0,
        followerCountChange: "",
        followersGained: 0,
        followersLost: 0,
        netFollowerChange: 0,
      };
    } catch {
      return {};
    }
  }

  // ─── Assemble full InstagramAnalytics ────────────────────────────────────

  async buildAnalytics(sinceTs?: number, untilTs?: number): Promise<InstagramAnalytics> {
    const [profile, rawMedia] = await Promise.all([this.getProfile(), this.getMedia(100)]);

    // Fetch per-media insights for all posts; pass isReel flag for watch time metrics
    const insightsBatch = await Promise.all(
      rawMedia.map((m) => this.getMediaInsights(m.id, m.media_type === "REEL"))
    );

    const posts: InstagramPost[] = rawMedia.map((m, i) => {
      const ins = insightsBatch[i];
      const isReel = m.media_type === "REEL";
      return {
        id: m.id,
        timestamp: new Date(m.timestamp),
        caption: m.caption ?? "",
        mediaType: m.media_type === "CAROUSEL_ALBUM" ? "CAROUSEL" : isReel ? "REEL" : "IMAGE",
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        shares: ins.shares ?? 0,
        reach: ins.reach ?? 0,
        impressions: ins.impressions ?? 0,
        savedCount: ins.saved ?? 0,
        thumbnailUrl: m.thumbnail_url,
        ...(isReel && {
          avgWatchTime: ins.ig_reels_avg_watch_time,
          videoViews: ins.video_views,
        }),
      };
    });

    // ── Compute metrics ───────────────────────────────────────────────────
    const totalPosts = posts.filter((p) => p.mediaType !== "STORY").length || 1;
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
    const totalComments = posts.reduce((s, p) => s + p.comments, 0);
    const totalReach = posts.reduce((s, p) => s + p.reach, 0);
    const engagementRate =
      profile.followerCount > 0
        ? ((totalLikes + totalComments) / totalPosts / profile.followerCount) * 100
        : 0;

    // Best posting days from real engagement data
    const dayEngagement: Record<number, { total: number; count: number }> = {};
    const hourEngagement: Record<number, { total: number; count: number }> = {};
    for (const p of posts) {
      const d = new Date(p.timestamp);
      const day = d.getDay();
      const hour = d.getHours();
      const eng = p.likes + p.comments + p.shares;
      dayEngagement[day] = {
        total: (dayEngagement[day]?.total ?? 0) + eng,
        count: (dayEngagement[day]?.count ?? 0) + 1,
      };
      hourEngagement[hour] = {
        total: (hourEngagement[hour]?.total ?? 0) + eng,
        count: (hourEngagement[hour]?.count ?? 0) + 1,
      };
    }

    const FR_DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const bestPostingDays = Object.entries(dayEngagement)
      .map(([d, v]) => ({ day: FR_DAYS[Number(d)], avgEngagement: Math.round(v.total / v.count) }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    const bestPostingHours = Object.entries(hourEngagement)
      .map(([h, v]) => ({ hour: Number(h), avgEngagement: Math.round(v.total / v.count) }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Content type performance
    const typeMap: Record<string, { likes: number; comments: number; count: number }> = {};
    for (const p of posts) {
      const t = p.mediaType;
      if (!typeMap[t]) typeMap[t] = { likes: 0, comments: 0, count: 0 };
      typeMap[t].likes += p.likes;
      typeMap[t].comments += p.comments;
      typeMap[t].count++;
    }
    const contentTypePerformance = Object.entries(typeMap).map(([type, v]) => ({
      type,
      avgLikes: Math.round(v.likes / v.count),
      avgComments: Math.round(v.comments / v.count),
      avgEngagement: Math.round((v.likes + v.comments) / v.count),
      count: v.count,
      engagementRate:
        profile.followerCount > 0
          ? ((v.likes + v.comments) / v.count / profile.followerCount) * 100
          : 0,
    }));

    const metrics: InstagramMetrics = {
      engagementRate: Math.round(engagementRate * 100) / 100,
      avgLikesPerPost: Math.round(totalLikes / totalPosts),
      avgCommentsPerPost: Math.round(totalComments / totalPosts),
      avgReachPerPost: Math.round(totalReach / totalPosts),
      followerGrowthRate: 0,
      followerGrowthByMonth: [],
      bestPostingDays,
      bestPostingHours,
      contentTypePerformance,
      inactiveFollowersCount: 0,
      inactiveFollowersPercentage: 0,
      nonReciprocalFollowsCount: 0,
      topPosts: [...posts]
        .sort((a, b) => b.likes + b.comments - (a.likes + a.comments))
        .slice(0, 10),
    };

    // ── Account-level insights ─────────────────────────────────────────────
    const [accountInsights, demographics] = await Promise.all([
      this.getAccountInsights(sinceTs, untilTs),
      this.getAudienceDemographics(),
    ]);

    const reachInsights: ReachInsights = {
      period: "30 derniers jours",
      accountsReached: accountInsights.reach,
      accountsReachedChange: "",
      followerReachPct: 0,
      nonFollowerReachPct: 0,
      impressions: accountInsights.impressions,
      impressionsChange: "",
      profileVisits: accountInsights.profileViews,
      profileVisitsChange: "",
      externalLinkTaps: 0,
    };

    const audienceInsights: AudienceInsights = {
      period: demographics.period ?? "30 derniers jours",
      followerCount: profile.followerCount,
      followerCountChange: "",
      followersGained: demographics.followersGained ?? 0,
      followersLost: demographics.followersLost ?? 0,
      netFollowerChange: demographics.netFollowerChange ?? 0,
      topCities: demographics.topCities ?? {},
      topCountries: demographics.topCountries ?? {},
      ageGroups: demographics.ageGroups ?? {},
      genderSplit: demographics.genderSplit ?? { male: 50, female: 50 },
      dailyActivity: demographics.dailyActivity ?? {},
    };

    const contentInteractions: ContentInteractions = {
      period: "30 derniers jours",
      totalInteractions: totalLikes + totalComments,
      totalInteractionsChange: "",
      posts: {
        interactions: posts
          .filter((p) => p.mediaType === "IMAGE" || p.mediaType === "CAROUSEL")
          .reduce((s, p) => s + p.likes + p.comments, 0),
        likes: posts.filter((p) => p.mediaType === "IMAGE").reduce((s, p) => s + p.likes, 0),
        comments: posts.filter((p) => p.mediaType === "IMAGE").reduce((s, p) => s + p.comments, 0),
        shares: posts.filter((p) => p.mediaType === "IMAGE").reduce((s, p) => s + p.shares, 0),
        saves: posts.filter((p) => p.mediaType === "IMAGE").reduce((s, p) => s + p.savedCount, 0),
      },
      stories: { interactions: 0, replies: 0 },
      reels: {
        interactions: posts
          .filter((p) => p.mediaType === "REEL")
          .reduce((s, p) => s + p.likes + p.comments, 0),
        likes: posts.filter((p) => p.mediaType === "REEL").reduce((s, p) => s + p.likes, 0),
        comments: posts.filter((p) => p.mediaType === "REEL").reduce((s, p) => s + p.comments, 0),
        shares: posts.filter((p) => p.mediaType === "REEL").reduce((s, p) => s + p.shares, 0),
        saves: posts.filter((p) => p.mediaType === "REEL").reduce((s, p) => s + p.savedCount, 0),
      },
      accountsInteracted: 0,
      accountsInteractedChange: "",
      nonFollowerInteractionPct: 0,
    };

    return {
      profile,
      followers: [],
      following: [],
      posts,
      metrics,
      audienceInsights,
      contentInteractions,
      reachInsights,
      parsedAt: new Date(),
      dataSource: "api",
    };
  }
}
