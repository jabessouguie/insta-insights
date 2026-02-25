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

// ============================================================
// Instagram Insights Types (from past_instagram_insights/)
// ============================================================

export interface AudienceInsights {
  period: string;
  followerCount: number;
  followerCountChange: string;
  followersGained: number;
  followersLost: number;
  netFollowerChange: number;
  topCities: Record<string, number>;
  topCountries: Record<string, number>;
  ageGroups: Record<string, number>;
  genderSplit: { male: number; female: number };
  dailyActivity: Record<string, number>;
}

export interface ContentInteractions {
  period: string;
  totalInteractions: number;
  totalInteractionsChange: string;
  posts: {
    interactions: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  stories: {
    interactions: number;
    replies: number;
  };
  reels: {
    interactions: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  accountsInteracted: number;
  accountsInteractedChange: string;
  nonFollowerInteractionPct: number;
}

export interface ReachInsights {
  period: string;
  accountsReached: number;
  accountsReachedChange: string;
  followerReachPct: number;
  nonFollowerReachPct: number;
  impressions: number;
  impressionsChange: string;
  profileVisits: number;
  profileVisitsChange: string;
  externalLinkTaps: number;
}

export interface InstagramMetrics {
  engagementRate: number;
  engagementRateWithReels?: number;
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
  audienceInsights?: AudienceInsights;
  contentInteractions?: ContentInteractions;
  reachInsights?: ReachInsights;
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
  /** Recent posts (caption + timestamp) for theme & timing analysis */
  posts?: Array<{ caption: string; timestamp: string; mediaType: string }>;
  /** Audience demographics & follower growth from the export */
  audienceInsights?: Partial<AudienceInsights>;
  /** Content interaction breakdown (likes/saves/shares by format) */
  contentInteractions?: Partial<ContentInteractions>;
  /** Reach & impressions data */
  reachInsights?: Partial<ReachInsights>;
  /** Optional user feedback to steer regeneration */
  userFeedback?: string;
}

export interface InsightsApiResponse {
  success: boolean;
  data?: InsightsResponse;
  error?: string;
}

// ============================================================
// Carousel Generator Types
// ============================================================

export interface CarouselFonts {
  title: string; // e.g. "Playfair Display"
  subtitle: string; // e.g. "Inter"
  body: string; // e.g. "Inter"
}

export interface CarouselAudience {
  gender: "all" | "female" | "male";
  region: string; // e.g. "France", "Côte d'Ivoire"
  interests: string; // comma-separated
}

export interface CarouselSlideContent {
  title: string;
  subtitle: string;
  body: string;
  /** Index into the uploaded photos array (0-based). -1 = gradient background */
  photoIndex: number;
}

export interface CarouselGenerateRequest {
  subject: string;
  audience: CarouselAudience;
  fonts: CarouselFonts;
  primaryColor: string; // hex
  accentColor: string; // hex
  numSlides: number; // 3-8
  /** Base64-encoded photos (data:image/...;base64,...) */
  photos: string[];
  /** Recent post captions for style analysis */
  previousCaptions: string[];
  /** Language for slide text and Instagram description. Defaults to "en". */
  language?: "en" | "fr";
}

export interface CarouselGenerateResponse {
  success: boolean;
  slides?: CarouselSlideContent[];
  instagramDescription?: string;
  hashtags?: string[];
  error?: string;
}

// ============================================================
// Interaction Analysis Types
// ============================================================

export interface UnfollowCandidate {
  username: string;
  followedSince: Date;
  profileUrl: string;
  lastDmSentAt?: Date; // undefined = never DM'd
}

export interface DMSuggestion {
  username: string;
  profileUrl: string;
  suggestedDm: string;
  reason: string; // e.g. "follows you, you follow back, 0 interactions"
}

export interface InteractionAnalysis {
  /** Accounts you follow that have never liked or commented on your posts */
  neverInteracted: UnfollowCandidate[];
  /** Accounts you follow but don't follow back, suggested for a DM */
  dmSuggestions: DMSuggestion[];
  /** Accounts you follow, don't follow back, DM sent > 1 month ago → unfollow */
  unfollowCandidates: UnfollowCandidate[];
}

export interface InteractionApiResponse {
  success: boolean;
  data?: InteractionAnalysis;
  error?: string;
}

export interface DMSuggestRequest {
  username: string;
  profileUrl: string;
  creatorProfile: Partial<InstagramProfile>;
}

export interface DMSuggestResponse {
  success: boolean;
  data?: { suggestedDm: string };
  error?: string;
}
