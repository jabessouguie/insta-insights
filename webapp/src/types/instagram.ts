// ============================================================
// Instagram Data Types
// ============================================================

export type MediaType = "IMAGE" | "VIDEO" | "REEL" | "STORY" | "CAROUSEL";

export interface InstagramProfile {
  username: string;
  fullName: string;
  bio: string;
  website: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  profilePicUrl: string;
  isVerified: boolean;
  accountCreatedAt?: Date;
}

export interface InstagramFollower {
  username: string;
  followedAt: Date;
  isFollowingBack: boolean;
  isActive: boolean; // has interacted in the last 90 days
}

export interface InstagramPost {
  id: string;
  timestamp: Date;
  caption: string;
  mediaType: MediaType;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  savedCount: number;
  url?: string;
  thumbnailUrl?: string;
}

export interface FollowerGrowthPoint {
  month: string; // "YYYY-MM"
  count: number;
  gain: number;
  loss: number;
}

export interface PostingTimeData {
  day: string; // "Monday", "Tuesday", etc.
  hour: number; // 0-23
  avgEngagement: number;
  postCount: number;
}

export interface ContentTypePerformance {
  type: MediaType | string;
  avgEngagement: number;
  avgLikes: number;
  avgComments: number;
  count: number;
  engagementRate: number;
}

export interface InstagramMetrics {
  engagementRate: number;
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  avgReachPerPost: number;
  followerGrowthRate: number; // % over last 30 days
  followerGrowthByMonth: FollowerGrowthPoint[];
  bestPostingDays: { day: string; avgEngagement: number }[];
  bestPostingHours: { hour: number; avgEngagement: number }[];
  contentTypePerformance: ContentTypePerformance[];
  inactiveFollowersCount: number;
  inactiveFollowersPercentage: number;
  nonReciprocalFollowsCount: number;
  topPosts: InstagramPost[];
}

export interface InstagramAnalytics {
  profile: InstagramProfile;
  followers: InstagramFollower[];
  following: InstagramFollower[];
  posts: InstagramPost[];
  metrics: InstagramMetrics;
  parsedAt: Date;
  dataSource: "export" | "api" | "mock";
}

// ============================================================
// Agency Types
// ============================================================

export type CreatorCategory =
  | "Lifestyle"
  | "Fashion"
  | "Food"
  | "Travel"
  | "Tech"
  | "Beauty"
  | "Fitness"
  | "Gaming"
  | "Art"
  | "Music"
  | "Business"
  | "Other";

export interface CreatorProfile {
  id: string;
  username: string;
  fullName: string;
  profilePicUrl: string;
  category: CreatorCategory;
  followerCount: number;
  followingCount: number;
  engagementRate: number;
  avgReach: number;
  audienceQualityScore: number; // 0-100
  contentConsistencyScore: number; // 0-100
  growthScore: number; // 0-100
  overallScore: number; // 0-100
  isVerified: boolean;
  analytics?: InstagramAnalytics;
  tags: string[];
  estimatedEarningsPerPost?: number; // USD
}

export interface AgencyPortfolio {
  agencyName: string;
  creators: CreatorProfile[];
  totalReach: number;
  avgEngagementRate: number;
  totalFollowers: number;
}

// ============================================================
// AI Insights Types
// ============================================================

export interface AIInsight {
  id: string;
  type: "success" | "warning" | "tip" | "alert";
  category: "engagement" | "growth" | "content" | "audience" | "timing" | "strategy";
  title: string;
  description: string;
  metric?: string;
  recommendation?: string;
  priority: "high" | "medium" | "low";
}

export interface InsightsResponse {
  insights: AIInsight[];
  summary: string;
  generatedAt: Date;
  model: string;
}

// ============================================================
// API Types
// ============================================================

export interface DataApiResponse {
  success: boolean;
  data?: InstagramAnalytics;
  error?: string;
}

export interface InsightsApiRequest {
  metrics: Partial<InstagramMetrics>;
  profile: Partial<InstagramProfile>;
  mode: "creator" | "agency";
  creatorProfile?: Partial<CreatorProfile>;
}

export interface InsightsApiResponse {
  success: boolean;
  data?: InsightsResponse;
  error?: string;
}
