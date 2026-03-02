/**
 * Gemini AI Integration
 * Uses Google's Gemini API to generate Instagram analytics insights.
 *
 * Model strategy:
 *   - gemini-3-pro-preview  → complex multi-step analysis (insights)
 *   - gemini-3-flash-preview → fast single-turn generation (DMs, carousel)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { InsightsApiRequest, InsightsResponse, AIInsight } from "@/types/instagram";

const PRO_MODEL = "gemini-2.5-flash";

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(key);
}

function buildCreatorPrompt(req: InsightsApiRequest): string {
  const { metrics, profile, posts, audienceInsights, contentInteractions, reachInsights } = req;

  // ── Captions with context ──────────────────────────────────────────────────
  const captionsWithMeta =
    posts && posts.length > 0
      ? posts
          .filter((p) => p.caption.trim().length > 0)
          .slice(0, 20)
          .map((p, i) => {
            const d = new Date(p.timestamp);
            const dayLabel = d.toLocaleDateString("fr-FR", { weekday: "short" });
            const hourLabel = `${d.getHours()}h`;
            return `${i + 1}. [${p.mediaType} · ${dayLabel} ${hourLabel}] "${p.caption.substring(0, 200)}"`;
          })
          .join("\n")
      : null;

  // ── Niche inference from captions ─────────────────────────────────────────
  const nicheHint = captionsWithMeta
    ? "Déduis la niche principale (lifestyle, mode, voyage, fitness, beauté, humour, food, business…) à partir des captions ci-dessous."
    : "";

  // ── Timing ────────────────────────────────────────────────────────────────
  const hourDist =
    metrics.bestPostingHours
      ?.slice(0, 5)
      .map((h) => `${h.hour}h`)
      .join(", ") ?? "N/A";

  const dayDist =
    metrics.bestPostingDays
      ?.slice(0, 5)
      .map((d) => d.day)
      .join(", ") ?? "N/A";

  // ── Follower tier ─────────────────────────────────────────────────────────
  const followers = profile.followerCount ?? 0;
  const followerTier =
    followers < 5_000
      ? "nano-créateur (<5k)"
      : followers < 10_000
        ? "nano-créateur (5k–10k)"
        : followers < 50_000
          ? "micro-créateur (10k–50k)"
          : followers < 200_000
            ? "mid-tier (50k–200k)"
            : "macro-créateur (>200k)";

  // ── Most active days (from dailyActivity) ─────────────────────────────────
  let dailyActivitySection = "";
  if (audienceInsights?.dailyActivity && Object.keys(audienceInsights.dailyActivity).length > 0) {
    const sorted = Object.entries(audienceInsights.dailyActivity).sort(([, a], [, b]) => b - a);
    const topDay = sorted[0]?.[0];
    const bottomDay = sorted[sorted.length - 1]?.[0];
    const dayList = sorted.map(([day, count]) => `${day}: ${count}`).join(", ");
    dailyActivitySection = `
### Activité des followers par jour
${dayList}
→ Jour le plus actif : ${topDay ?? "N/A"} | Jour le moins actif : ${bottomDay ?? "N/A"}`;
  }

  // ── Period-over-period changes (algorithm change signal) ───────────────────
  let periodChangeSection = "";
  const changeSignals: string[] = [];
  if (contentInteractions?.totalInteractionsChange)
    changeSignals.push(`Interactions totales : ${contentInteractions.totalInteractionsChange}`);
  if (contentInteractions?.accountsInteractedChange)
    changeSignals.push(`Comptes ayant interagi : ${contentInteractions.accountsInteractedChange}`);
  if (reachInsights?.accountsReachedChange)
    changeSignals.push(`Comptes touchés : ${reachInsights.accountsReachedChange}`);
  if (reachInsights?.impressionsChange)
    changeSignals.push(`Impressions : ${reachInsights.impressionsChange}`);
  if (reachInsights?.profileVisitsChange)
    changeSignals.push(`Visites profil : ${reachInsights.profileVisitsChange}`);
  if (changeSignals.length > 0) {
    periodChangeSection = `
### Évolution période sur période (signal algorithmique)
${changeSignals.join("\n")}`;
  }

  // ── Audience demographics ─────────────────────────────────────────────────
  let audienceSection = "";
  if (audienceInsights) {
    const { topCities, topCountries, ageGroups, genderSplit, followersGained, followersLost } =
      audienceInsights;

    const topCitiesStr =
      topCities && Object.keys(topCities).length > 0
        ? Object.entries(topCities)
            .slice(0, 5)
            .map(([city, n]) => `${city} (${n})`)
            .join(", ")
        : null;

    const topCountriesStr =
      topCountries && Object.keys(topCountries).length > 0
        ? Object.entries(topCountries)
            .slice(0, 5)
            .map(([country, n]) => `${country} (${n})`)
            .join(", ")
        : null;

    const ageStr =
      ageGroups && Object.keys(ageGroups).length > 0
        ? Object.entries(ageGroups)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([range, pct]) => `${range}: ${pct}%`)
            .join(", ")
        : null;

    const genderStr = genderSplit
      ? `${genderSplit.female ?? 0}% femmes · ${genderSplit.male ?? 0}% hommes`
      : null;

    audienceSection = `
### Audience & démographie
${topCountriesStr ? `- Pays principaux : ${topCountriesStr}` : ""}
${topCitiesStr ? `- Villes principales : ${topCitiesStr}` : ""}
${ageStr ? `- Tranches d'âge : ${ageStr}` : ""}
${genderStr ? `- Genre : ${genderStr}` : ""}
${followersGained != null ? `- Abonnés gagnés (période) : +${followersGained}` : ""}
${followersLost != null ? `- Abonnés perdus (période) : -${followersLost}` : ""}`;
  }

  // ── Content interactions ───────────────────────────────────────────────────
  let interactionsSection = "";
  if (contentInteractions) {
    const {
      posts: pI,
      reels: rI,
      stories: sI,
      nonFollowerInteractionPct,
      period,
    } = contentInteractions;
    interactionsSection = `
### Interactions contenu (période : ${period ?? "N/A"})
- Posts (images/carousels) : ${pI?.likes ?? 0} likes · ${pI?.comments ?? 0} commentaires · ${pI?.saves ?? 0} enregistrements · ${pI?.shares ?? 0} partages
- Reels : ${rI?.likes ?? 0} likes · ${rI?.comments ?? 0} commentaires · ${rI?.saves ?? 0} enregistrements · ${rI?.shares ?? 0} partages
- Stories : ${sI?.replies ?? 0} réponses
- Interactions hors abonnés : ${nonFollowerInteractionPct ?? 0}%`;
  }

  // ── Reach ─────────────────────────────────────────────────────────────────
  let reachSection = "";
  if (reachInsights) {
    const { accountsReached, nonFollowerReachPct, impressions, profileVisits } = reachInsights;
    reachSection = `
### Portée & visibilité
- Comptes atteints : ${(accountsReached ?? 0).toLocaleString("fr-FR")} (dont ${nonFollowerReachPct ?? 0}% hors abonnés)
- Impressions : ${(impressions ?? 0).toLocaleString("fr-FR")}
- Visites du profil : ${(profileVisits ?? 0).toLocaleString("fr-FR")}`;
  }

  return `Tu es un expert senior en stratégie Instagram et growth marketing, spécialisé dans l'accompagnement de créateurs francophones.

Analyse les données Instagram ci-dessous et génère des insights ULTRA-PERSONNALISÉS, directement actionnables, adaptés à :
- La niche du créateur (déduite des captions)
- Son niveau (${followerTier})
- Son audience cible (démographie, localisation)
- Ses chiffres réels (ne génère pas d'insights génériques)

### Profil
- Compte : @${profile.username || "inconnu"}
- Abonnés : ${followers.toLocaleString("fr-FR")} (${followerTier})
- Posts publiés : ${profile.postCount ?? 0}

### Métriques de performance
- Taux d'engagement : ${metrics.engagementRate?.toFixed(2) ?? "N/A"}%
- Likes moyens/post : ${Math.round(metrics.avgLikesPerPost ?? 0)}
- Commentaires moyens/post : ${Math.round(metrics.avgCommentsPerPost ?? 0)}
- Croissance abonnés : ${metrics.followerGrowthRate?.toFixed(1) ?? "N/A"}%
${audienceSection}${interactionsSection}${reachSection}${dailyActivitySection}${periodChangeSection}

### Timing de publication
- Heures les plus actives (basé sur les posts) : ${hourDist}
- Jours les plus actifs (basé sur les posts) : ${dayDist}

### Performance par type de contenu
${
  metrics.contentTypePerformance
    ?.map((c) => `- ${c.type}: ${c.count} posts, engagement moyen ${c.avgEngagement?.toFixed(0)}`)
    .join("\n") ?? "N/A"
}
${
  captionsWithMeta
    ? `
### Publications récentes (captions — pour identifier la niche, le ton, les thèmes)
${captionsWithMeta}

${nicheHint}
À partir de ces captions, identifie :
- La niche principale du créateur
- Le ton général (inspirationnel, humoristique, informatif, personnel, éducatif…)
- Les thèmes/sujets qui semblent générer le plus d'engagement (repère les mots-clés récurrents dans les captions les plus récentes)
- Les accroches et formats qui génèrent le plus d'engagement`
    : ""
}

${
  req.previousInsights && req.previousInsights.length > 0
    ? `### Insights précédemment générés (à approfondir — ne pas répéter, aller plus loin)
${req.previousInsights.map((i) => `- [${i.category}] ${i.title} : ${i.description}`).join("\n")}

→ Génère 6 nouveaux insights qui approfondissent ou complètent ceux ci-dessus. Explore des angles non encore couverts, affine les recommandations avec plus de précision, ou identifie des opportunités cachées dans les données.
`
    : ""
}Génère exactement 6 insights JSON hyper-personnalisés (sans markdown, juste le JSON).
Chaque insight doit mentionner des chiffres réels issus des données, citer la niche et/ou l'audience, et donner une recommandation concrète et spécifique.
Inclus obligatoirement :
- 1 insight "timing" sur le meilleur jour/créneau selon les données d'activité des followers (utilise la section "Activité des followers par jour" si disponible)
- 1 insight "content" sur les thèmes/formats qui plaisent à cette audience (identifie 2-3 thèmes récurrents dans les captions et leur performance relative)
- 1 insight "audience" sur la démographie et la localisation
- 1 insight sur les saves/partages (viralité potentielle)
- 1 insight "strategy" sur l'évolution algorithmique : si les données période sur période montrent une variation supérieure à ±30%, analyse si cela reflète un changement d'algorithme ou une évolution de stratégie, et recommande comment en profiter ou s'adapter

{
  "summary": "Résumé en 2 phrases : niche identifiée + insight principal chiffré + meilleur levier de croissance",
  "insights": [
    {
      "id": "1",
      "type": "success|warning|tip|alert",
      "category": "engagement|growth|content|audience|timing|strategy",
      "title": "Titre court et spécifique (<60 chars)",
      "description": "Description personnalisée avec chiffres réels (2-3 phrases)",
      "metric": "valeur clé chiffrée (ex: 4.2% ER, 340 saves, 72% audience féminine)",
      "recommendation": "Action concrète et spécifique à cette niche et cette audience",
      "priority": "high|medium|low"
    }
  ]
}${req.userFeedback ? `\n\nRetours utilisateur sur la version précédente : ${req.userFeedback}` : ""}`;
}

function buildAgencyPrompt(req: InsightsApiRequest): string {
  const { profile, creatorProfile, audienceInsights } = req;

  const topCountriesStr =
    audienceInsights?.topCountries && Object.keys(audienceInsights.topCountries).length > 0
      ? Object.entries(audienceInsights.topCountries)
          .slice(0, 3)
          .map(([c, n]) => `${c} (${n})`)
          .join(", ")
      : null;

  return `Tu es un consultant senior en marketing d'influence.

Analyse le profil de ce créateur de contenu pour une agence et génère un rapport professionnel en français.

### Créateur
- Compte : @${profile.username || "inconnu"}
- Abonnés : ${(profile.followerCount ?? 0).toLocaleString("fr-FR")}
- Catégorie : ${creatorProfile?.category ?? "N/A"}
- Score global : ${creatorProfile?.overallScore ?? "N/A"}/100
- Score qualité audience : ${creatorProfile?.audienceQualityScore ?? "N/A"}/100
- Taux d'engagement : ${req.metrics.engagementRate?.toFixed(2) ?? "N/A"}%
${topCountriesStr ? `- Marchés principaux : ${topCountriesStr}` : ""}

Génère exactement 5 insights JSON pour l'agence (sans markdown, juste le JSON):
{
  "summary": "Résumé professionnel en 2 phrases pour l'agence",
  "insights": [
    {
      "id": "1",
      "type": "success|warning|tip|alert",
      "category": "engagement|growth|content|audience|timing|strategy",
      "title": "Titre court (<60 chars)",
      "description": "Description avec contexte business (2-3 phrases)",
      "metric": "valeur clé",
      "recommendation": "Recommandation stratégique pour l'agence",
      "priority": "high|medium|low"
    }
  ]
}${req.userFeedback ? `\n\nRetours utilisateur sur la version précédente : ${req.userFeedback}` : ""}`;
}

export async function generateInsights(req: InsightsApiRequest): Promise<InsightsResponse> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: PRO_MODEL });

  const prompt = req.mode === "agency" ? buildAgencyPrompt(req) : buildCreatorPrompt(req);

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code fences if present
  const clean = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  let parsed: { summary: string; insights: AIInsight[] };
  try {
    parsed = JSON.parse(clean);
  } catch {
    // Fallback: return a generic response
    parsed = {
      summary:
        "Analyse en cours. Les données sont insuffisantes pour générer des insights complets.",
      insights: [
        {
          id: "1",
          type: "tip",
          category: "strategy",
          title: "Continuez à publier régulièrement",
          description:
            "La régularité est la clé du succès sur Instagram. Publiez au minimum 3 fois par semaine.",
          recommendation: "Créez un calendrier éditorial et respectez-le.",
          priority: "high",
        },
      ],
    };
  }

  return {
    insights: parsed.insights || [],
    summary: parsed.summary || "",
    generatedAt: new Date(),
    model: PRO_MODEL,
  };
}
