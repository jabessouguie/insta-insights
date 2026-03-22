import type { InstagramPost } from "@/types/instagram";

export interface HashtagStat {
  tag: string;
  count: number;
  avgLikes: number;
  avgComments: number;
  /** Average total interactions (likes + comments + saves) per post using this tag */
  avgEngagement: number;
}

/**
 * Extract all hashtags from a caption string.
 * Returns lowercase hashtags including the # prefix.
 * Supports ASCII, Latin Extended and accented characters.
 */
export function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/gi) ?? [];
  return matches.map((h) => h.toLowerCase());
}

/**
 * Returns true if at least some posts carry per-post engagement data (likes > 0).
 * The HTML Instagram export does NOT include per-post likes/comments, so this
 * returns false when the data comes from a real export rather than mock or Graph API.
 */
export function hasEngagementData(posts: InstagramPost[]): boolean {
  return posts.some((p) => p.likes > 0 || p.comments > 0);
}

/**
 * Compute per-hashtag performance statistics across all posts.
 * Returns stats sorted by usage count descending.
 */
export function analyzeHashtags(posts: InstagramPost[]): HashtagStat[] {
  const map = new Map<
    string,
    { likes: number; comments: number; engagement: number; count: number }
  >();

  for (const post of posts) {
    const tags = extractHashtags(post.caption);
    if (tags.length === 0) continue;
    const engagement = post.likes + post.comments + (post.savedCount ?? 0);

    for (const tag of tags) {
      const existing = map.get(tag) ?? { likes: 0, comments: 0, engagement: 0, count: 0 };
      map.set(tag, {
        likes: existing.likes + post.likes,
        comments: existing.comments + post.comments,
        engagement: existing.engagement + engagement,
        count: existing.count + 1,
      });
    }
  }

  return Array.from(map.entries())
    .map(([tag, stats]) => ({
      tag,
      count: stats.count,
      avgLikes: Math.round(stats.likes / stats.count),
      avgComments: Math.round(stats.comments / stats.count),
      avgEngagement: Math.round(stats.engagement / stats.count),
    }))
    .sort((a, b) => b.count - a.count);
}
