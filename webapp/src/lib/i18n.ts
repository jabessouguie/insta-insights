/**
 * Lightweight i18n — flat key/value dictionaries for FR and EN.
 * Usage: import { useT } from "@/lib/i18n";
 *        const t = useT();  →  t("dashboard.title")
 */

import { useLanguage } from "@/contexts/LanguageContext";

const FR = {
  // ── Header ────────────────────────────────────────────────────────────────
  "header.creator": "Créateur",
  "header.agency": "Agence",
  "header.followers": "abonnés",
  "header.portfolio": "Portfolio",
  "nav.dashboard": "Dashboard",
  "nav.interactions": "Interactions",
  "nav.mediakit": "Media Kit",
  "nav.collabs": "Collabs",
  "nav.responses": "Réponses",
  "nav.comments": "Commentaires",
  "nav.carousel": "Carrousel",

  // ── Dashboard ─────────────────────────────────────────────────────────────
  "dashboard.title": "Dashboard Créateur",
  "dashboard.loading": "Chargement des données...",
  "dashboard.noData": "Aucune donnée disponible",
  "dashboard.updatedAt": "Mis à jour",
  "dashboard.dataPeriod": "Période",
  "dashboard.source": "Source",

  // ── Tabs ──────────────────────────────────────────────────────────────────
  "tabs.overview": "Vue d'ensemble",
  "tabs.content": "Contenu",
  "tabs.audience": "Audience",

  // ── KPI cards ─────────────────────────────────────────────────────────────
  "kpi.followers": "Abonnés",
  "kpi.engagementRate": "Taux d'engagement",
  "kpi.avgLikes": "Likes moyens / post",
  "kpi.avgComments": "Commentaires moyens / post",
  "kpi.accountsReached": "Comptes touchés",
  "kpi.impressions": "Impressions",
  "kpi.profileVisits": "Visites du profil",
  "kpi.accountsInteracted": "Comptes ayant interagi",

  // ── Content tab ───────────────────────────────────────────────────────────
  "content.engagementByType": "Engagement par format",
  "content.engagementByTypeDesc": "Interactions moyennes selon le type de contenu publié",
  "content.bestTimes": "Meilleurs moments",
  "content.topPosts": "Publications récentes",
  "content.topPostsDesc": "Derniers posts hors stories, triés par date",
  "content.noCaption": "Sans légende",

  // ── Audience tab ──────────────────────────────────────────────────────────
  "audience.reach": "Portée & Impressions",
  "audience.reachDesc": "Données de la période d'insights",
  "audience.reelInteractions": "Interactions Reels",
  "audience.saves": "Enregistrements",
  "audience.nonFollowerReach": "Portée hors abonnés",
  "audience.quality": "Qualité de l'audience",
  "audience.demographics": "Démographie",

  // ── Common ────────────────────────────────────────────────────────────────
  "common.generate": "Générer",
  "common.refresh": "Actualiser",
  "common.loading": "Chargement...",
  "common.analyzing": "Analyse...",
  "common.download": "Télécharger",
  "common.copy": "Copier",
  "common.copied": "Copié !",
  "common.preview": "Aperçu",
  "common.back": "Retour",
  "common.next": "Suivant",
  "common.save": "Enregistrer",

  // ── Interactions ───────────────────────────────────────────────────────────
  "interactions.title": "Analyse des Interactions",
  "interactions.subtitle":
    "Identifie les comptes inactifs, les contacts à relancer et ceux à unfollow.",
  "interactions.badge.neverInteracted": "jamais interagi",
  "interactions.badge.toContact": "à contacter",
  "interactions.badge.toUnfollow": "à unfollow",
  "interactions.tabs.inactive": "Inactifs",
  "interactions.tabs.dmSuggestions": "DM suggérés",
  "interactions.tabs.unfollow": "À unfollow",
  "interactions.inactive.title": "Abonnés que tu suis, jamais interagi",
  "interactions.inactive.description":
    "Ces comptes te suivent et tu les suis, mais ils n'ont jamais liké ni commenté tes posts.",
  "interactions.inactive.empty": "🎉 Tous tes contacts ont interagi avec ton contenu !",
  "interactions.candidate.followedSince": "Suivi depuis le",
  "interactions.candidate.unknownDate": "date inconnue",
  "interactions.candidate.lastDm": "DM envoyé le",
  "interactions.candidate.unfollowTag": "À unfollow",
  "interactions.dm.title": "Comptes à relancer",
  "interactions.dm.description":
    "Tu les suis mais ils ne te suivent pas en retour. Gemini génère un DM personnalisé pour chaque compte.",
  "interactions.dm.empty": "Aucun compte à contacter pour l'instant.",
  "interactions.dm.generating": "Rédaction du DM en cours…",
  "interactions.dm.helper": "Clique sur « Générer » pour obtenir un DM personnalisé via Gemini.",
  "interactions.dm.feedbackPlaceholder":
    "Ex: rends le ton plus chaleureux, mentionne leur contenu vidéo…",
  "interactions.dm.generating_button": "Génération...",
  "interactions.dm.generateButton": "Générer le DM",
  "interactions.unfollow.title": "Comptes à unfollow",
  "interactions.unfollow.description":
    "Tu les suis, ils ne te suivent pas, et tu leur as envoyé un DM il y a plus d'un mois sans réponse.",
  "interactions.unfollow.empty": "Aucun compte à unfollow pour l'instant.",

  // ── Collabs ────────────────────────────────────────────────────────────────
  "collabs.title": "Trouveur de Collabs",
  "collabs.subtitle":
    "Indique ta localisation et tes centres d'intérêt — Gemini identifie les meilleures opportunités et génère les emails.",
  "collabs.location.label": "📍 Localisation",
  "collabs.location.placeholder": "Paris, Lyon, Bordeaux...",
  "collabs.interests.label": "🎯 Centres d'intérêt",
  "collabs.interests.customPlaceholder": "Autre centre d'intérêt...",
  "collabs.type.brand": "Marque",
  "collabs.type.creator": "Créateur",
  "collabs.type.event": "Événement",
  "collabs.type.media": "Média",
  "collabs.card.hide": "Masquer",
  "collabs.card.show": "Voir",
  "collabs.card.generateEmail": "Générer l'email",
  "collabs.card.regenerateEmail": "Régénérer l'email",
  "collabs.email.subject": "Objet",
  "collabs.email.body": "Corps",
  "collabs.email.copied": "✓ Copié !",
  "collabs.email.copyButton": "Copier l'email complet",
  "collabs.email.feedbackPlaceholder":
    "Ex: rends l'objet plus accrocheur, ajoute un tarif, ton plus décontracté…",
  "collabs.email.status.analyzeProfile": "Analyse du profil de la marque…",
  "collabs.email.status.draftSubject": "Rédaction de l'objet de l'email…",
  "collabs.email.status.customizeContent": "Personnalisation du contenu…",
  "collabs.email.status.addCTA": "Ajout du call-to-action…",
  "collabs.search.button": "Trouver des collabs",
  "collabs.search.error": "Erreur lors de la recherche.",
  "collabs.search.networkError": "Erreur réseau. Vérifie ta connexion.",
  "collabs.search.status.analyzeProfile": "Analyse de ton profil…",
  "collabs.search.status.searchPartners": "Recherche de partenaires compatibles…",
  "collabs.search.status.evaluateOpportunities": "Évaluation des opportunités de collaboration…",
  "collabs.search.status.selectMatches": "Sélection des meilleures correspondances…",
  "collabs.search.status.finalizeResults": "Finalisation des résultats via Gemini…",
  "collabs.summary.prefix": "Gemini : ",

  // ── Comments ───────────────────────────────────────────────────────────────
  "comments.title": "Générateur de commentaires",
  "comments.subtitle":
    "Donne-moi la caption d'un post et je génère des commentaires qui correspondent à ta personnalité.",
  "comments.tone.enthusiastic": "Enthousiaste",
  "comments.tone.casual": "Naturel",
  "comments.tone.thoughtful": "Sincère",
  "comments.tone.inspiring": "Inspirant",
  "comments.card.option": "Option",
  "comments.card.copied": "Copié !",
  "comments.card.copy": "Copier",
  "comments.form.title": "Le post à commenter",
  "comments.form.description": "La caption est obligatoire. L'URL est optionnelle.",
  "comments.form.urlLabel": "URL du post (optionnel)",
  "comments.form.urlPlaceholder": "https://www.instagram.com/p/...",
  "comments.form.captionLabel": "Caption / Contexte du post *",
  "comments.form.captionPlaceholder": "Colle ici la caption du post que tu veux commenter...",
  "comments.form.toneLabel": "Ton du commentaire",
  "comments.form.languageLabel": "Langue des commentaires :",
  "comments.form.language.fr": "Français",
  "comments.form.language.en": "English",
  "comments.form.languageHelper": "(modifiable dans la barre de navigation)",
  "comments.error.captionRequired": "Saisis au moins la caption ou le contexte du post.",
  "comments.error.generationFailed": "Erreur lors de la génération.",
  "comments.error.networkError": "Impossible de contacter le serveur.",
  "comments.button.generating": "Génération en cours...",
  "comments.button.generate": "Générer 3 commentaires",
  "comments.button.regenerate": "Regénérer",
  "comments.results.label": "Commentaires générés",
  "comments.note.personality":
    "Les commentaires sont générés en tenant compte de ta bio et de tes publications récentes pour correspondre à ta personnalité.",

  // ── Insights Panel ─────────────────────────────────────────────────────────
  "insights.title": "Insights IA Gemini",
  "insights.subtitle": "Recommandations personnalisées basées sur vos données",
  "insights.priority.high": "Priorité haute",
  "insights.priority.medium": "Moyen",
  "insights.priority.low": "Faible",
  "insights.status.analyzeProfile": "Analyse de ton profil Instagram…",
  "insights.status.identifyNiche": "Identification de ta niche et de ton audience…",
  "insights.status.readMetrics": "Lecture des métriques d'engagement…",
  "insights.status.analyzeTopContent": "Analyse de tes contenus les plus performants…",
  "insights.status.generateRecommendations": "Génération des recommandations personnalisées…",
  "insights.status.personalizeForNiche": "Personnalisation pour ta niche et ton marché…",
  "insights.status.finalize": "Finalisation des insights…",
  "insights.button.analyzing": "Analyse...",
  "insights.button.refresh": "Actualiser",
  "insights.button.generate": "Générer",
  "insights.empty": "Cliquez sur « Générer » pour obtenir des insights IA personnalisés",
  "insights.feedbackPlaceholder":
    "Ex: concentre-toi sur la croissance, donne plus de conseils contenu, sois plus précis sur les Reels…",

  // ── AI Feedback Bar ────────────────────────────────────────────────────────
  "feedback.label": "Pas satisfait · précisez vos retours (optionnel)",
  "feedback.defaultPlaceholder":
    "Ex : rends le ton plus professionnel, ajoute plus de chiffres, cible une audience plus jeune…",
  "feedback.button.regenerating": "Régénération…",
  "feedback.button.regenerate": "Régénérer",
} as const;

const EN: Record<keyof typeof FR, string> = {
  // ── Header ────────────────────────────────────────────────────────────────
  "header.creator": "Creator",
  "header.agency": "Agency",
  "header.followers": "followers",
  "header.portfolio": "Portfolio",
  "nav.dashboard": "Dashboard",
  "nav.interactions": "Interactions",
  "nav.mediakit": "Media Kit",
  "nav.collabs": "Collabs",
  "nav.responses": "Replies",
  "nav.comments": "Comments",
  "nav.carousel": "Carousel",

  // ── Dashboard ─────────────────────────────────────────────────────────────
  "dashboard.title": "Creator Dashboard",
  "dashboard.loading": "Loading data...",
  "dashboard.noData": "No data available",
  "dashboard.updatedAt": "Updated",
  "dashboard.dataPeriod": "Period",
  "dashboard.source": "Source",

  // ── Tabs ──────────────────────────────────────────────────────────────────
  "tabs.overview": "Overview",
  "tabs.content": "Content",
  "tabs.audience": "Audience",

  // ── KPI cards ─────────────────────────────────────────────────────────────
  "kpi.followers": "Followers",
  "kpi.engagementRate": "Engagement rate",
  "kpi.avgLikes": "Avg likes / post",
  "kpi.avgComments": "Avg comments / post",
  "kpi.accountsReached": "Accounts reached",
  "kpi.impressions": "Impressions",
  "kpi.profileVisits": "Profile visits",
  "kpi.accountsInteracted": "Accounts interacted",

  // ── Content tab ───────────────────────────────────────────────────────────
  "content.engagementByType": "Engagement by format",
  "content.engagementByTypeDesc": "Average interactions by content type published",
  "content.bestTimes": "Best times",
  "content.topPosts": "Recent posts",
  "content.topPostsDesc": "Latest non-story posts, sorted by date",
  "content.noCaption": "No caption",

  // ── Audience tab ──────────────────────────────────────────────────────────
  "audience.reach": "Reach & Impressions",
  "audience.reachDesc": "Data for the insights period",
  "audience.reelInteractions": "Reel interactions",
  "audience.saves": "Saves",
  "audience.nonFollowerReach": "Non-follower reach",
  "audience.quality": "Audience quality",
  "audience.demographics": "Demographics",

  // ── Common ────────────────────────────────────────────────────────────────
  "common.generate": "Generate",
  "common.refresh": "Refresh",
  "common.loading": "Loading...",
  "common.analyzing": "Analyzing...",
  "common.download": "Download",
  "common.copy": "Copy",
  "common.copied": "Copied!",
  "common.preview": "Preview",
  "common.back": "Back",
  "common.next": "Next",
  "common.save": "Save",

  // ── Interactions ───────────────────────────────────────────────────────────
  "interactions.title": "Interaction Analysis",
  "interactions.subtitle":
    "Identify inactive accounts, contacts to re-engage, and accounts to unfollow.",
  "interactions.badge.neverInteracted": "never interacted",
  "interactions.badge.toContact": "to contact",
  "interactions.badge.toUnfollow": "to unfollow",
  "interactions.tabs.inactive": "Inactive",
  "interactions.tabs.dmSuggestions": "DM suggestions",
  "interactions.tabs.unfollow": "Unfollow",
  "interactions.inactive.title": "Accounts you follow, never interacted",
  "interactions.inactive.description":
    "These accounts follow you and you follow them, but they've never liked or commented on your posts.",
  "interactions.inactive.empty": "🎉 All your contacts have engaged with your content!",
  "interactions.candidate.followedSince": "Following since",
  "interactions.candidate.unknownDate": "unknown date",
  "interactions.candidate.lastDm": "DM sent on",
  "interactions.candidate.unfollowTag": "Unfollow",
  "interactions.dm.title": "Accounts to re-engage",
  "interactions.dm.description":
    "You follow them but they don't follow you back. Gemini drafts a personalised DM for each.",
  "interactions.dm.empty": "No accounts to contact right now.",
  "interactions.dm.generating": "Writing DM…",
  "interactions.dm.helper": 'Click "Generate" to get a personalised DM via Gemini.',
  "interactions.dm.feedbackPlaceholder": "E.g.: make the tone warmer, mention their video content…",
  "interactions.dm.generating_button": "Generating...",
  "interactions.dm.generateButton": "Generate DM",
  "interactions.unfollow.title": "Accounts to unfollow",
  "interactions.unfollow.description":
    "You follow them, they don't follow back, and you sent a DM over a month ago with no reply.",
  "interactions.unfollow.empty": "No accounts to unfollow right now.",

  // ── Collabs ────────────────────────────────────────────────────────────────
  "collabs.title": "Collab Finder",
  "collabs.subtitle":
    "Enter your location and interests — Gemini finds the best opportunities and drafts the emails.",
  "collabs.location.label": "📍 Location",
  "collabs.location.placeholder": "Paris, Lyon, Bordeaux...",
  "collabs.interests.label": "🎯 Interests",
  "collabs.interests.customPlaceholder": "Another interest...",
  "collabs.type.brand": "Brand",
  "collabs.type.creator": "Creator",
  "collabs.type.event": "Event",
  "collabs.type.media": "Media",
  "collabs.card.hide": "Hide",
  "collabs.card.show": "Show",
  "collabs.card.generateEmail": "Generate email",
  "collabs.card.regenerateEmail": "Regenerate email",
  "collabs.email.subject": "Subject",
  "collabs.email.body": "Body",
  "collabs.email.copied": "✓ Copied!",
  "collabs.email.copyButton": "Copy full email",
  "collabs.email.feedbackPlaceholder":
    "E.g.: make the subject catchier, add a rate, more casual tone…",
  "collabs.email.status.analyzeProfile": "Analysing brand profile…",
  "collabs.email.status.draftSubject": "Drafting email subject…",
  "collabs.email.status.customizeContent": "Personalising content…",
  "collabs.email.status.addCTA": "Adding call-to-action…",
  "collabs.search.button": "Find collabs",
  "collabs.search.error": "Search failed.",
  "collabs.search.networkError": "Network error. Check your connection.",
  "collabs.search.status.analyzeProfile": "Analysing your profile…",
  "collabs.search.status.searchPartners": "Searching for compatible partners…",
  "collabs.search.status.evaluateOpportunities": "Evaluating collab opportunities…",
  "collabs.search.status.selectMatches": "Selecting best matches…",
  "collabs.search.status.finalizeResults": "Finalising results via Gemini…",
  "collabs.summary.prefix": "Gemini: ",

  // ── Comments ───────────────────────────────────────────────────────────────
  "comments.title": "Comment generator",
  "comments.subtitle":
    "Give me a post caption and I'll generate comments that match your personality.",
  "comments.tone.enthusiastic": "Enthusiastic",
  "comments.tone.casual": "Casual",
  "comments.tone.thoughtful": "Thoughtful",
  "comments.tone.inspiring": "Inspiring",
  "comments.card.option": "Option",
  "comments.card.copied": "Copied!",
  "comments.card.copy": "Copy",
  "comments.form.title": "The post to comment on",
  "comments.form.description": "Caption is required. URL is optional.",
  "comments.form.urlLabel": "Post URL (optional)",
  "comments.form.urlPlaceholder": "https://www.instagram.com/p/...",
  "comments.form.captionLabel": "Caption / Post context *",
  "comments.form.captionPlaceholder": "Paste the caption of the post you want to comment on...",
  "comments.form.toneLabel": "Comment tone",
  "comments.form.languageLabel": "Comment language:",
  "comments.form.language.fr": "Français",
  "comments.form.language.en": "English",
  "comments.form.languageHelper": "(change in the navigation bar)",
  "comments.error.captionRequired": "Enter at least the caption or post context.",
  "comments.error.generationFailed": "Generation failed.",
  "comments.error.networkError": "Could not reach the server.",
  "comments.button.generating": "Generating...",
  "comments.button.generate": "Generate 3 comments",
  "comments.button.regenerate": "Regenerate",
  "comments.results.label": "Generated comments",
  "comments.note.personality":
    "Comments are generated taking into account your bio and recent posts to match your personality.",

  // ── Insights Panel ─────────────────────────────────────────────────────────
  "insights.title": "Gemini AI Insights",
  "insights.subtitle": "Personalised recommendations based on your data",
  "insights.priority.high": "High priority",
  "insights.priority.medium": "Medium",
  "insights.priority.low": "Low",
  "insights.status.analyzeProfile": "Analysing your Instagram profile…",
  "insights.status.identifyNiche": "Identifying your niche and audience…",
  "insights.status.readMetrics": "Reading engagement metrics…",
  "insights.status.analyzeTopContent": "Analysing your top-performing content…",
  "insights.status.generateRecommendations": "Generating personalised recommendations…",
  "insights.status.personalizeForNiche": "Personalising for your niche and market…",
  "insights.status.finalize": "Finalising insights…",
  "insights.button.analyzing": "Analysing...",
  "insights.button.refresh": "Refresh",
  "insights.button.generate": "Generate",
  "insights.empty": 'Click "Generate" to get personalised AI insights',
  "insights.feedbackPlaceholder":
    "E.g.: focus on growth, give more content tips, be more specific about Reels…",

  // ── AI Feedback Bar ────────────────────────────────────────────────────────
  "feedback.label": "Not satisfied · add your feedback (optional)",
  "feedback.defaultPlaceholder":
    "E.g.: make the tone more professional, add more numbers, target a younger audience…",
  "feedback.button.regenerating": "Regenerating…",
  "feedback.button.regenerate": "Regenerate",
};

export type TranslationKey = keyof typeof FR;

/** Hook — returns a t() function scoped to the current language. */
export function useT() {
  const { lang } = useLanguage();
  const dict = lang === "en" ? EN : FR;
  return (key: TranslationKey) => dict[key] ?? key;
}
