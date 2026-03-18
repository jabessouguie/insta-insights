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
  /** Reels only — from ig_reels_avg_watch_time (seconds) */
  avgWatchTime?: number;
  /** Reels only — total video plays */
  videoViews?: number;
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
  /** Previously generated insights — used to deepen analysis on regeneration */
  previousInsights?: AIInsight[];
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
  regions: string[]; // e.g. ["France", "Belgique"]
  interests: string[]; // e.g. ["fitness", "lifestyle"]
  ageRanges: string[]; // e.g. ["18-24", "25-34"] — empty = all ages
  /** Audience targeting mode:
   * - "custom": manual input (default)
   * - "my_audience": auto-filled from real analytics
   * - "optimized": AI determines best audience for the post topic
   */
  mode?: "custom" | "my_audience" | "optimized";
}

/** Background style applied behind the title text block on a carousel slide. */
export type TextBgStyle = "none" | "highlight" | "pill" | "glass";

/** Per-slide visual styling for the title text block. */
export interface CarouselTextStyle {
  /** Background style behind the title. Default "none". */
  bg?: TextBgStyle;
  /** Hex color for highlight/pill backgrounds. Falls back to accentColor when absent. */
  bgColor?: string;
  /** Opacity of the background, 0–1. Default 0.85. */
  bgOpacity?: number;
  /** Drop shadow behind text for readability. */
  shadow?: boolean;
  /** Colored glow effect using accentColor — dramatic, use sparingly. */
  glow?: boolean;
  /** Subtle organic rotation in degrees (–5 to +5). 0 = no rotation. */
  rotation?: number;
  /** Shrink the font size automatically until the title fits in maxWidth. */
  autoScale?: boolean;
}

export interface CarouselSlideContent {
  title: string;
  subtitle: string;
  body: string;
  /** Index into the uploaded photos array (0-based). -1 = gradient background */
  photoIndex: number;
  /** Optional per-slide text style for the title block. */
  textStyle?: CarouselTextStyle;
}

export interface CarouselGenerateRequest {
  subject: string;
  audience: CarouselAudience;
  fonts: CarouselFonts;
  primaryColor: string; // hex
  accentColor: string; // hex
  numSlides: number; // 1-20
  /** Base64-encoded photos (data:image/...;base64,...) */
  photos: string[];
  /** Recent post captions for style analysis */
  previousCaptions: string[];
  /** Language for slide text and Instagram description. Defaults to "en". */
  language?: "en" | "fr";
  /** Gemini model override. Defaults to "gemini-2.5-flash". */
  model?: string;
  /** Optional content prompt context from analytics — injected into the generation prompt */
  promptContext?: string;
}

export interface CarouselGenerateResponse {
  success: boolean;
  slides?: CarouselSlideContent[];
  instagramDescription?: string;
  hashtags?: string[];
  error?: string;
}

export interface ReelGenerateRequest {
  prompt: string;
  videoClips?: string[]; // base64 data URLs (video/mp4, video/mov, etc.)
  durationSeconds?: number; // 5-8 for Veo 3
  model?: string; // "veo-3.0-fast" | "veo-3.0"
  language?: "en" | "fr";
  audience?: CarouselAudience;
  brandColors?: { primary: string; accent: string };
  brandFonts?: { title: string; body: string };
}

export interface ReelGenerateResponse {
  success: boolean;
  video?: string; // base64 data URL "data:video/mp4;base64,..."
  error?: string;
}

export interface ReelAudioRequest {
  musicPrompt: string;
  durationSeconds?: number;
  bpm?: number;
  temperature?: number;
}

export interface ReelAudioResponse {
  success: boolean;
  audio?: string; // base64 data URL "data:audio/wav;base64,..."
  error?: string;
}

// ============================================================
// Reel Ideas Generator Types
// ============================================================

export interface ReelIdea {
  caption: string;
  /** Accroche pour les 3 premières secondes */
  hook: string;
  /** "my_audience" = audience actuelle du créateur | "optimized" = audience la plus réactive */
  targetMode: "my_audience" | "optimized";
  /** Description de l'audience ciblée */
  audienceDescription: string;
  tags: string[];
}

export interface ReelIdeasRequest {
  idea: string;
  profile: {
    username?: string;
    followerCount?: number;
    bio?: string;
  };
  recentCaptions?: string[];
  audienceInsights?: {
    topCountries?: Record<string, number>;
    ageGroups?: Record<string, number>;
    genderSplit?: { male: number; female: number };
  };
}

export interface ReelIdeasResponse {
  success: boolean;
  ideas?: ReelIdea[];
  trendingTopics?: string[];
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
  followedSince: Date;
  profileUrl: string;
  /** Fetched bio or null if unavailable */
  bio?: string | null;
  reason: string;
}

export interface InteractionAnalysis {
  /** Mutual follows who never liked or commented */
  neverInteracted: UnfollowCandidate[];
  /** You follow, they don't follow back, never DM'd → suggest DM */
  dmSuggestionsNoFollowBack: DMSuggestion[];
  /** Mutual follow, you never DM'd them → suggest DM */
  dmSuggestionsMutual: DMSuggestion[];
  /** You follow, they don't follow back, DM sent > 1 month ago → unfollow */
  unfollowCandidates: UnfollowCandidate[];
  /** "api" = sourced from Graph API; "export" = sourced from local export */
  dataSource?: "api" | "export";
}

export interface InteractionApiResponse {
  success: boolean;
  data?: InteractionAnalysis;
  error?: string;
}

// ============================================================
// Calendar / Scheduler Types
// ============================================================

export type ContentType = "post" | "carousel" | "story" | "reel";
export type ContentStatus = "draft" | "scheduled" | "published";

export interface ScheduledItem {
  id: string;
  type: ContentType;
  status: ContentStatus;
  /** ISO 8601 string */
  scheduledAt: string;
  caption: string;
  hashtags: string[];
  /** base64 data URLs (images or video) */
  assets: string[];
  igInstructions: {
    stickers?: string[];
    links?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface OptimalSlot {
  /** 0 = Sunday … 6 = Saturday */
  dayIndex: number;
  /** 0-23 */
  hour: number;
  /** combined engagement score (normalised 0-1) */
  score: number;
  isTopSlot: boolean;
}

// ============================================================
// Instagram Graph API Types
// ============================================================

export interface RawComment {
  id: string;
  text: string;
  timestamp: string;
  username: string;
}

// ============================================================
// Audience Intelligence Types
// ============================================================

export interface BigFiveScores {
  openness: number; // 0-100
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface AudiencePersona {
  name: string; // e.g. "L'Explorateur Ambitieux"
  emoji: string;
  description: string;
  sharePercent: number; // % of audience this persona represents
  bigFive: BigFiveScores;
  motivations: string[]; // e.g. ["Découverte", "Statut social"]
  contentPillars: string[]; // e.g. ["Behind-the-scenes", "Tutoriels"]
}

export interface BrandVoiceAudit {
  consistencyScore: number; // 0-100
  dominantTone: string; // e.g. "Inspirant et authentique"
  avgCaptionLength: number;
  ctaUsageRate: number; // % of posts with a CTA
  suggestions: string[];
}

export interface AudienceSegmentsResponse {
  success: boolean;
  personas?: AudiencePersona[];
  brandVoice?: BrandVoiceAudit;
  commentCount?: number; // how many real comments were analysed
  dataSource: "graph_api" | "export_inference";
  error?: string;
}

// ============================================================
// Executive Report Types
// ============================================================

export interface ExecutiveReport {
  period: string;
  executiveSummary: string;
  keyWins: string[];
  keyAlerts: string[];
  contentPerformance: string;
  audienceTrends: string;
  nextMonthRecommendations: string[];
  generatedAt: string;
}

export interface ReportGenerateResponse {
  success: boolean;
  report?: ExecutiveReport;
  error?: string;
}

// ============================================================
// Skip Rate Analysis Types
// ============================================================

export interface SkipRateInsights {
  patterns: string[]; // e.g. "Hook trop long", "Pas de texte à l'écran"
  topSkippedCaptions: string[]; // captions of worst-performing reels
  recommendations: string[];
  medianWatchTime: number; // seconds
}

export interface SkipRateAnalysisResponse {
  success: boolean;
  insights?: SkipRateInsights;
  /** Prompt context derived from the analysis — save to localStorage for future generations */
  captionContext?: {
    topThemes: string[];
    bestAngles: string[];
    skipPatterns: string[];
    promptFragment: string;
  };
  error?: string;
}

// ============================================================
// Competitive Intelligence Types
// ============================================================

export interface CompetitiveGap {
  category: string; // e.g. "Formats vidéo", "Hashtags"
  description: string;
  opportunity: string;
}

export interface CompetitiveAnalysis {
  positioning: string; // narrative paragraph
  strengths: string[];
  gaps: CompetitiveGap[];
  contentFormats: string[]; // untapped formats used in the niche
  recommendations: string[];
  generatedAt: string;
}

export interface CompetitiveAnalysisResponse {
  success: boolean;
  analysis?: CompetitiveAnalysis;
  error?: string;
}

// ─── Social Inbox ─────────────────────────────────────────────────────────────

export interface InboxReply {
  id: string;
  username: string;
  text: string;
  timestamp: string;
}

export interface InboxComment {
  id: string;
  mediaId: string;
  mediaCaption: string;
  mediaType: string;
  username: string;
  text: string;
  timestamp: string;
  likeCount: number;
  replies: InboxReply[];
}

export interface InboxData {
  comments: InboxComment[];
  dataSource: "api" | "unavailable";
}

export interface InboxResponse {
  success: boolean;
  data?: InboxData;
  error?: string;
}

export interface InboxReplyRequest {
  commentId?: string;
  mediaId?: string;
  message: string;
}

export interface InboxReplyResponse {
  success: boolean;
  id?: string;
  error?: string;
}

// ============================================================
// Guide Generator Types
// ============================================================

export type GuideType = "travel" | "tutorial" | "recipe" | "tips" | "general";

export interface GuideSection {
  /** Section heading */
  title: string;
  /** Paragraph content for this section */
  content: string;
  /** Index into the uploaded photos array — -1 or undefined = no photo */
  photoIndex?: number;
}

export interface GuideConfig {
  /** Full guide title */
  title: string;
  /** Optional subtitle or tagline */
  subtitle?: string;
  type: GuideType;
  /** Author name shown in footer */
  authorName?: string;
  /** Primary brand colour (hex, e.g. "#E040FB") */
  accentColor?: string;
  sections: GuideSection[];
  /** Base64 data URLs for uploaded photos */
  photos?: string[];
}
