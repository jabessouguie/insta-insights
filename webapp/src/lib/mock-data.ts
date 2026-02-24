/**
 * Mock data for development and demo purposes.
 * Used when real Instagram export data is not available.
 */

import type {
  InstagramAnalytics,
  InstagramProfile,
  InstagramPost,
  InstagramFollower,
  AgencyPortfolio,
  CreatorProfile,
  AIInsight,
} from "@/types/instagram";

// ─── Profile ──────────────────────────────────────────────────────────────────

const mockProfile: InstagramProfile = {
  username: "jeanseestheworld",
  fullName: "Jean Sees The World",
  bio: "📍 Voyageur passionné | 🌍 50+ pays | 📸 Photographe amateur",
  website: "https://jeanseestheworld.com",
  followerCount: 6623,
  followingCount: 490,
  postCount: 348,
  profilePicUrl:
    "https://ui-avatars.com/api/?name=Jean+Sees+The+World&background=gradient&color=fff&size=128",
  isVerified: false,
};

// ─── Posts ────────────────────────────────────────────────────────────────────

function generatePosts(count: number): InstagramPost[] {
  const types = ["IMAGE", "REEL", "STORY", "CAROUSEL"] as const;
  const captions = [
    "Les rues de Tokyo 🇯🇵 #travel #japan",
    "Lever de soleil depuis le Mont Fuji ⛰️ #fuji",
    "Découverte d'un café caché dans le Marais 🥐 #paris",
    "Le Sahara depuis le ciel 🏜️ #sahara #adventure",
    "Rencontre inoubliable au Vietnam 🇻🇳 #vietnam",
    "Coucher de soleil à Santorini 🌅 #greece",
    "Plongée en apnée à Bali 🤿 #bali #diving",
    "Street food à Bangkok 🍜 #bangkok #food",
    "Trek dans les Dolomites 🏔️ #italy #hiking",
    "Les couleurs de Marrakech 🎨 #morocco",
  ];

  return Array.from({ length: count }, (_, i) => {
    const daysAgo = Math.floor(Math.random() * 365);
    const timestamp = new Date(Date.now() - daysAgo * 86_400_000);
    const type = types[i % types.length];
    const isReel = type === "REEL";

    const baseLikes = Math.floor(Math.random() * 200 + 50);
    const likesMultiplier = isReel ? 1.8 + Math.random() : 1;

    return {
      id: `post_${i}`,
      timestamp,
      caption: captions[i % captions.length],
      mediaType: type,
      likes: Math.floor(baseLikes * likesMultiplier),
      comments: Math.floor(Math.random() * 30 + 2),
      shares: isReel ? Math.floor(Math.random() * 20 + 5) : 0,
      reach: Math.floor(Math.random() * 3000 + 500),
      impressions: Math.floor(Math.random() * 5000 + 800),
      savedCount: Math.floor(Math.random() * 50 + 5),
    };
  });
}

// ─── Followers ────────────────────────────────────────────────────────────────

function generateFollowers(count: number): InstagramFollower[] {
  return Array.from({ length: count }, (_, i) => {
    const daysAgo = Math.floor(Math.random() * 730);
    return {
      username: `user_${i}_${Math.random().toString(36).substring(7)}`,
      followedAt: new Date(Date.now() - daysAgo * 86_400_000),
      isFollowingBack: Math.random() > 0.9,
      isActive: Math.random() > 0.75, // ~25% active
    };
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

const mockPosts = generatePosts(348);
const mockFollowers = generateFollowers(6623);

function buildGrowthByMonth() {
  const months = [];
  let cumulative = 0;
  for (let i = 23; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const gain = Math.floor(Math.random() * 300 + 50);
    const loss = Math.floor(Math.random() * 50 + 10);
    cumulative += gain - loss;
    months.push({ month: key, count: cumulative, gain, loss });
  }
  return months;
}

export const mockAnalytics: InstagramAnalytics = {
  profile: mockProfile,
  followers: mockFollowers,
  following: generateFollowers(490),
  posts: mockPosts,
  metrics: {
    engagementRate: 4.2,
    avgLikesPerPost: 187,
    avgCommentsPerPost: 12,
    avgReachPerPost: 2340,
    followerGrowthRate: 8.5,
    followerGrowthByMonth: buildGrowthByMonth(),
    bestPostingDays: [
      { day: "Mardi", avgEngagement: 220 },
      { day: "Jeudi", avgEngagement: 195 },
      { day: "Samedi", avgEngagement: 178 },
      { day: "Mercredi", avgEngagement: 160 },
      { day: "Vendredi", avgEngagement: 145 },
      { day: "Lundi", avgEngagement: 130 },
      { day: "Dimanche", avgEngagement: 115 },
    ],
    bestPostingHours: [
      { hour: 19, avgEngagement: 250 },
      { hour: 12, avgEngagement: 210 },
      { hour: 21, avgEngagement: 195 },
      { hour: 9, avgEngagement: 165 },
      { hour: 18, avgEngagement: 155 },
      { hour: 20, avgEngagement: 150 },
      { hour: 8, avgEngagement: 120 },
    ],
    contentTypePerformance: [
      {
        type: "REEL",
        avgEngagement: 342,
        avgLikes: 305,
        avgComments: 37,
        count: 89,
        engagementRate: 5.2,
      },
      {
        type: "CAROUSEL",
        avgEngagement: 210,
        avgLikes: 185,
        avgComments: 25,
        count: 64,
        engagementRate: 3.2,
      },
      {
        type: "IMAGE",
        avgEngagement: 165,
        avgLikes: 148,
        avgComments: 17,
        count: 175,
        engagementRate: 2.5,
      },
      {
        type: "STORY",
        avgEngagement: 88,
        avgLikes: 78,
        avgComments: 10,
        count: 20,
        engagementRate: 1.3,
      },
    ],
    inactiveFollowersCount: Math.floor(6623 * 0.75),
    inactiveFollowersPercentage: 75,
    nonReciprocalFollowsCount: 66,
    topPosts: mockPosts.sort((a, b) => b.likes - a.likes).slice(0, 10),
  },
  parsedAt: new Date(),
  dataSource: "mock",
};

// ─── Agency mock data ─────────────────────────────────────────────────────────

const creatorTemplates: Omit<CreatorProfile, "id" | "analytics">[] = [
  {
    username: "jeanseestheworld",
    fullName: "Jean Sees The World",
    profilePicUrl: "https://ui-avatars.com/api/?name=Jean+S&background=6366f1&color=fff",
    category: "Travel",
    followerCount: 6623,
    followingCount: 490,
    engagementRate: 4.2,
    avgReach: 12400,
    audienceQualityScore: 68,
    contentConsistencyScore: 75,
    growthScore: 72,
    overallScore: 72,
    isVerified: false,
    tags: ["voyage", "photographie", "lifestyle"],
    estimatedEarningsPerPost: 320,
  },
  {
    username: "sophiestyle_paris",
    fullName: "Sophie & Style",
    profilePicUrl: "https://ui-avatars.com/api/?name=Sophie+S&background=ec4899&color=fff",
    category: "Fashion",
    followerCount: 28400,
    followingCount: 1200,
    engagementRate: 3.1,
    avgReach: 45000,
    audienceQualityScore: 82,
    contentConsistencyScore: 91,
    growthScore: 65,
    overallScore: 79,
    isVerified: false,
    tags: ["mode", "paris", "lifestyle", "beauté"],
    estimatedEarningsPerPost: 1450,
  },
  {
    username: "foodie_marc",
    fullName: "Marc & Cuisine",
    profilePicUrl: "https://ui-avatars.com/api/?name=Marc+C&background=f59e0b&color=fff",
    category: "Food",
    followerCount: 12800,
    followingCount: 780,
    engagementRate: 5.8,
    avgReach: 28000,
    audienceQualityScore: 88,
    contentConsistencyScore: 85,
    growthScore: 78,
    overallScore: 84,
    isVerified: false,
    tags: ["cuisine", "gastronomie", "recettes"],
    estimatedEarningsPerPost: 750,
  },
  {
    username: "tech_by_lea",
    fullName: "Léa Tech & Digital",
    profilePicUrl: "https://ui-avatars.com/api/?name=Lea+T&background=14b8a6&color=fff",
    category: "Tech",
    followerCount: 45200,
    followingCount: 2100,
    engagementRate: 2.4,
    avgReach: 67000,
    audienceQualityScore: 91,
    contentConsistencyScore: 88,
    growthScore: 82,
    overallScore: 87,
    isVerified: true,
    tags: ["tech", "ia", "startups", "digital"],
    estimatedEarningsPerPost: 2800,
  },
  {
    username: "fitness_with_alex",
    fullName: "Alex Fitness Coach",
    profilePicUrl: "https://ui-avatars.com/api/?name=Alex+F&background=22c55e&color=fff",
    category: "Fitness",
    followerCount: 19700,
    followingCount: 890,
    engagementRate: 6.9,
    avgReach: 35000,
    audienceQualityScore: 85,
    contentConsistencyScore: 92,
    growthScore: 89,
    overallScore: 89,
    isVerified: false,
    tags: ["fitness", "santé", "musculation", "nutrition"],
    estimatedEarningsPerPost: 1100,
  },
];

export const mockAgencyPortfolio: AgencyPortfolio = {
  agencyName: "Lumière Agency",
  creators: creatorTemplates.map((c, i) => ({
    ...c,
    id: `creator_${i}`,
    analytics: i === 0 ? mockAnalytics : undefined,
  })),
  totalReach: creatorTemplates.reduce((a, c) => a + c.avgReach, 0),
  avgEngagementRate:
    creatorTemplates.reduce((a, c) => a + c.engagementRate, 0) / creatorTemplates.length,
  totalFollowers: creatorTemplates.reduce((a, c) => a + c.followerCount, 0),
};

// ─── Mock AI Insights ─────────────────────────────────────────────────────────

export const mockCreatorInsights: AIInsight[] = [
  {
    id: "1",
    type: "success",
    category: "content",
    title: "Les Reels génèrent 2x plus d'engagement",
    description:
      "Tes Reels obtiennent en moyenne 342 interactions vs 165 pour les photos statiques. Le format vidéo court est clairement ton point fort.",
    metric: "+107% vs photos",
    recommendation: "Augmente la fréquence des Reels à 3-4 par semaine pour maximiser ta portée.",
    priority: "high",
  },
  {
    id: "2",
    type: "tip",
    category: "timing",
    title: "Publie le mardi à 19h pour maximiser l'impact",
    description:
      "L'analyse de tes 348 posts révèle que le mardi soir (19h-21h) est ton créneau optimal avec un engagement moyen de 250 interactions.",
    metric: "Mardi 19h = top créneau",
    recommendation: "Programme tes posts principaux le mardi et jeudi entre 19h et 21h.",
    priority: "high",
  },
  {
    id: "3",
    type: "warning",
    category: "audience",
    title: "75% de tes abonnés sont inactifs",
    description:
      "Seulement 25% de tes 6,623 abonnés interagissent régulièrement avec ton contenu. Cette inactivité impacte ton algorithme.",
    metric: "~4,967 abonnés inactifs",
    recommendation:
      "Lance une campagne de réengagement avec des sondages en stories et du contenu interactif.",
    priority: "medium",
  },
  {
    id: "4",
    type: "tip",
    category: "growth",
    title: "Le Carousel boost la portée organique",
    description:
      "Les carousels génèrent 27% plus d'engagement que les posts simples grâce à la fonctionnalité de re-présentation d'Instagram.",
    metric: "+27% portée organique",
    recommendation:
      "Transforme tes meilleures photos en séries carousel avec un storytelling fort.",
    priority: "medium",
  },
  {
    id: "5",
    type: "alert",
    category: "strategy",
    title: "66 abonnements sans réciprocité",
    description:
      "Tu suis 66 comptes qui ne te suivent pas en retour. Ces comptes diluent ton ratio et peuvent nuire à la perception de ton profil.",
    metric: "66 non-réciproques",
    recommendation:
      "Fais un audit mensuel de tes abonnements et retire ceux sans valeur stratégique.",
    priority: "low",
  },
];

export const mockAgencyInsights: AIInsight[] = [
  {
    id: "1",
    type: "success",
    category: "engagement",
    title: "Alex Fitness est votre créateur le plus engageant",
    description:
      "Avec 6.9% de taux d'engagement et 92/100 en constance, Alex représente votre meilleur ROI actuel pour les marques fitness et nutrition.",
    metric: "6.9% engagement",
    recommendation: "Proposez Alex en priorité pour les campagnes fitness et bien-être.",
    priority: "high",
  },
  {
    id: "2",
    type: "tip",
    category: "strategy",
    title: "Léa Tech cible l'audience B2B la plus qualifiée",
    description:
      "Score d'audience de 91/100 et 45K abonnés tech-savvy. Son profil est idéal pour les campagnes SaaS et produits technologiques à haute valeur.",
    metric: "Score audience: 91/100",
    recommendation: "Négociez des partenariats long-terme avec des marques tech et SaaS pour Léa.",
    priority: "high",
  },
  {
    id: "3",
    type: "warning",
    category: "growth",
    title: "Jean doit scaler sa présence",
    description:
      "Malgré un engagement solide (4.2%), ses 6,623 abonnés limitent son potentiel commercial. Un plan de croissance est nécessaire.",
    metric: "6,623 abonnés (faible)",
    recommendation:
      "Investissez dans une stratégie de co-créations avec des comptes voyage plus importants.",
    priority: "medium",
  },
  {
    id: "4",
    type: "tip",
    category: "audience",
    title: "Portfolio diversifié = attractivité maximale",
    description:
      "Votre portfolio couvre 5 niches distinctes (voyage, mode, food, tech, fitness) permettant de répondre à 80% des demandes d'annonceurs.",
    metric: "5 niches couvertes",
    recommendation:
      "Complétez le portfolio avec un créateur Beauté ou Gaming pour couvrir encore plus de secteurs.",
    priority: "low",
  },
  {
    id: "5",
    type: "success",
    category: "strategy",
    title: "Potentiel de revenus: 6,420€/campagne",
    description:
      "En activant simultanément vos 5 créateurs sur une même campagne, vous pouvez facturer en moyenne 6,420€ tout en offrant une portée de 112K+ abonnés.",
    metric: "~6,420€ par campagne",
    recommendation:
      "Créez des packages multi-créateurs pour les annonceurs cherchant de la diversité.",
    priority: "high",
  },
];
