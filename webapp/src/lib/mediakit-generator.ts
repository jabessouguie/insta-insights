/**
 * Media Kit Generator
 * Generates a styled HTML media kit from the creator's real Instagram analytics.
 * Multi-column Canva-like layout with SVG infographics and 10 pre-defined themes.
 */

import type { InstagramAnalytics } from "@/types/instagram";

// ─── Themes ───────────────────────────────────────────────────────────────────

export interface MediaKitTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const MEDIAKIT_THEMES: Record<string, MediaKitTheme> = {
  forest: { name: "Forest", primary: "#1f3d3b", secondary: "#495b29", accent: "#ffd953" },
  elegant: { name: "Elegant", primary: "#1a1a2e", secondary: "#16213e", accent: "#e94560" },
  bold: { name: "Bold", primary: "#ff6b35", secondary: "#c0392b", accent: "#f1c40f" },
  minimal: { name: "Minimal", primary: "#2d3436", secondary: "#636e72", accent: "#00b894" },
  ocean: { name: "Ocean", primary: "#0077b6", secondary: "#00b4d8", accent: "#90e0ef" },
  sunset: { name: "Sunset", primary: "#f72585", secondary: "#7209b7", accent: "#ffd60a" },
  nordic: { name: "Nordic", primary: "#2b2d42", secondary: "#8d99ae", accent: "#ef233c" },
  warm: { name: "Warm", primary: "#6d4c41", secondary: "#a1887f", accent: "#ffb300" },
  neon: { name: "Neon", primary: "#0d0221", secondary: "#0a014f", accent: "#e500a4" },
  pastel: { name: "Pastel", primary: "#457b9d", secondary: "#a8dadc", accent: "#e63946" },
};

// ─── Config ───────────────────────────────────────────────────────────────────

export interface MediaKitConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontTitle: string;
  fontBody: string;
  tagline: string;
  services: string[];
  /** Past brand/media partnerships to showcase (e.g. "Nike", "Le Monde", "Air France") */
  pastPartnerships?: string[];
  contactEmail: string;
  ratePerPost?: string;
  profilePicUrl?: string;
  displayName?: string;
  theme?: string;
  /** Hero section background — "gradient" (default) | "primary" | "secondary" | "accent" */
  heroBg?: "gradient" | "primary" | "secondary" | "accent";
  /** Language for all text labels in the generated HTML — defaults to "en" */
  lang?: "en" | "fr";
}

export const defaultMediaKitConfig: MediaKitConfig = {
  primaryColor: MEDIAKIT_THEMES.forest.primary,
  secondaryColor: MEDIAKIT_THEMES.forest.secondary,
  accentColor: MEDIAKIT_THEMES.forest.accent,
  fontTitle: "Playfair Display",
  fontBody: "Inter",
  tagline: "Passionate content creator",
  services: ["Sponsored posts", "Stories", "Reels", "Product placement"],
  pastPartnerships: [],
  contactEmail: "",
  ratePerPost: "",
  theme: "forest",
  heroBg: "gradient",
};

// ─── SVG helpers ──────────────────────────────────────────────────────────────

/**
 * Generates a circular progress ring as an SVG string.
 * @param {number} pct Percentage to display (0-100).
 * @param {string} color Stroke color for the progress bar.
 * @param {string} label Label text shown under the percentage.
 * @param {number} [size=100] Size of the SVG in pixels.
 * @returns {string} SVG string.
 */
function svgRing(pct: number, color: string, label: string, size = 100): string {
  const r = 36;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="8"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="8"
    stroke-dasharray="${dash.toFixed(1)} ${(circ - dash).toFixed(1)}"
    stroke-dashoffset="${(circ / 4).toFixed(1)}"
    stroke-linecap="round"/>
  <text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="#1a1a2e" font-size="13" font-weight="800" font-family="inherit">${pct.toFixed(pct < 10 ? 1 : 0)}%</text>
  <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="rgba(0,0,0,0.45)" font-size="8" font-family="inherit">${label}</text>
</svg>`;
}

/**
 * Generates a gender distribution donut chart as an SVG string.
 * @param {number} female Percentage of female followers.
 * @param _male Percentage of male followers (unused; implied by female).
 * @param {string} primaryColor Main theme color.
 * @param {string} accentColor Accent theme color.
 * @returns {string} SVG string.
 */
function svgGenderDonut(
  female: number,
  _male: number,
  primaryColor: string,
  accentColor: string
): string {
  const size = 90;
  const cx = size / 2;
  const cy = size / 2;
  const r = 30;
  const circ = 2 * Math.PI * r;
  const femaleDash = (female / 100) * circ;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accentColor}" stroke-width="12"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${primaryColor}" stroke-width="12"
    stroke-dasharray="${femaleDash.toFixed(1)} ${(circ - femaleDash).toFixed(1)}"
    stroke-dashoffset="${(circ / 4).toFixed(1)}"
    stroke-linecap="butt"/>
  <text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="#1a1a2e" font-size="10" font-weight="700" font-family="inherit">♀ ${female.toFixed(0)}%</text>
</svg>`;
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

const ICON = {
  users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  trending: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  eye: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  image: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  globe: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  mail: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
};

// ─── Labels (fr / en) ─────────────────────────────────────────────────────────

function getLabels(lang: "en" | "fr") {
  const fr = {
    followers: "abonnés",
    engagementRate: "Taux d'engagement",
    reach: "Portée",
    impressions: "Impressions",
    performance: "Performance",
    keyMetrics: "Indicateurs clés",
    avgLikes: "Likes moyens",
    comments: "Commentaires",
    contentFormats: "Formats de contenu",
    posts: "publications",
    noData: "Aucune donnée",
    noDataAvailable: "Aucune donnée disponible",
    audience: "Audience",
    location: "Localisation",
    demographics: "Démographie",
    women: "Femmes",
    men: "Hommes",
    services: "Services",
    pastPartnerships: "Partenariats passés",
    letsWorkTogether: "Travaillons ensemble",
    ctaSubtitle:
      "Disponible pour des partenariats, placements produits et créations de contenu sur mesure.",
    from: "À partir de",
    perPost: "/ post",
    startingFrom: "À partir de",
    sponsoredPost: "post sponsorisé",
    nonFollowers: "Non-abonnés",
    dataFooter: "Données de l'export officiel Instagram",
    generatedWith: "Généré avec",
  } as const;

  const en = {
    followers: "followers",
    engagementRate: "Engagement rate",
    reach: "Reach",
    impressions: "Impressions",
    performance: "Performance",
    keyMetrics: "Key metrics",
    avgLikes: "Avg. likes",
    comments: "Comments",
    contentFormats: "Content formats",
    posts: "posts",
    noData: "No data",
    noDataAvailable: "No data available",
    audience: "Audience",
    location: "Location",
    demographics: "Demographics",
    women: "Women",
    men: "Men",
    services: "Services",
    pastPartnerships: "Past Partnerships",
    letsWorkTogether: "Let's work together",
    ctaSubtitle: "Available for partnerships, product placements, and custom content creation.",
    from: "From",
    perPost: "/ post",
    startingFrom: "Starting from",
    sponsoredPost: "sponsored post",
    nonFollowers: "Non-followers",
    dataFooter: "Data from official Instagram export",
    generatedWith: "Generated with",
  } as const;

  return lang === "fr" ? fr : en;
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Main entry point for generating the Media Kit HTML.
 * Combines analytics data with visual configuration to produce a complete HTML document.
 * @param {InstagramAnalytics} analytics Real analytics data from Instagram export or API.
 * @param {MediaKitConfig} config Visual and personal configuration for the Media Kit.
 * @returns {string} Complete HTML document as a string.
 */
export function generateMediaKitHTML(
  analytics: InstagramAnalytics,
  config: MediaKitConfig
): string {
  const { profile, metrics, reachInsights, audienceInsights } = analytics;
  const L = getLabels(config.lang ?? "en");

  const fmtNum = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)}K`
        : String(n);

  const engagement = metrics.engagementRate;
  const reach =
    reachInsights?.accountsReached ?? metrics.avgReachPerPost * (analytics.posts?.length ?? 0);
  const impressions = reachInsights?.impressions ?? profile.followerCount * 4;

  const titleFont = config.fontTitle || "Playfair Display";
  const bodyFont = config.fontBody || "Inter";
  const primary = config.primaryColor;
  const secondary = config.secondaryColor;
  const accent = config.accentColor;
  const gradient = `linear-gradient(135deg, ${primary}, ${secondary})`;
  const heroBgStyle =
    !config.heroBg || config.heroBg === "gradient"
      ? gradient
      : config.heroBg === "primary"
        ? primary
        : config.heroBg === "secondary"
          ? secondary
          : accent;
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(titleFont)}:wght@400;700;800&family=${encodeURIComponent(bodyFont)}:wght@300;400;500;600;700&display=swap`;

  // ── Audience data ──
  const topCountries = audienceInsights?.topCountries
    ? Object.entries(audienceInsights.topCountries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
    : [];

  const ageGroups = audienceInsights?.ageGroups
    ? Object.entries(audienceInsights.ageGroups).sort((a, b) => b[1] - a[1])
    : [];

  const maxAgeVal = ageGroups.length > 0 ? Math.max(...ageGroups.map(([, v]) => v)) : 100;

  const female = audienceInsights?.genderSplit?.female ?? 0;
  const male = audienceInsights?.genderSplit?.male ?? 0;
  const hasGender = female > 0 || male > 0;

  // ── Content performance ──
  const sortedContent = [...(metrics.contentTypePerformance ?? [])].sort(
    (a, b) => b.engagementRate - a.engagementRate
  );
  const maxER = sortedContent[0]?.engagementRate ?? 1;

  // ── SVGs ──
  const erRing = svgRing(engagement, accent, "Engagement");
  const nonFollowerPct = reachInsights?.nonFollowerReachPct ?? 0;
  const nonFollowerRing =
    nonFollowerPct > 0 ? svgRing(nonFollowerPct, secondary, L.nonFollowers) : "";
  const genderDonut = hasGender ? svgGenderDonut(female, male, accent, secondary) : "";

  // ── Top cities ──
  const topCities = audienceInsights?.topCities
    ? Object.entries(audienceInsights.topCities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : [];

  return `<!DOCTYPE html>
<html lang="${config.lang ?? "en"}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Media Kit – @${profile.username}</title>
  <link href="${googleFontsUrl}" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: '${bodyFont}', sans-serif;
      background: ${primary}12;
      color: #1a1a2e;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Variables ── */
    :root {
      --primary: ${primary};
      --secondary: ${secondary};
      --accent: ${accent};
      --card-bg: #ffffff;
      --card-border: rgba(0,0,0,0.08);
      --text-muted: rgba(0,0,0,0.4);
      --text-dim: rgba(0,0,0,0.65);
    }

    /* ── Hero ── */
    .hero {
      background: ${heroBgStyle};
      padding: 0;
      position: relative;
      overflow: hidden;
    }
    .hero::after {
      content:''; position:absolute; inset:0; pointer-events:none; z-index:0;
      background: url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='40' cy='40' r='30'/%3E%3C/g%3E%3C/svg%3E");
    }
    .hero-inner {
      position: relative; z-index: 1;
      max-width: 900px; margin: 0 auto;
      padding: 56px 40px;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 36px;
      align-items: center;
    }
    .avatar-wrap { position: relative; }
    .avatar {
      width: 130px; height: 130px; border-radius: 50%;
      border: 4px solid rgba(255,255,255,0.25);
      box-shadow: 0 0 0 8px rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 48px; font-weight: 800; color: white;
      overflow: hidden; flex-shrink: 0;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .hero-info h1 {
      font-size: 2.6rem; font-weight: 800; color: white;
      font-family: '${titleFont}', serif; line-height: 1.1;
      letter-spacing: -0.5px;
    }
    .hero-handle { font-size: 1rem; color: rgba(255,255,255,0.65); margin-top: 5px; }
    .hero-tagline {
      font-size: 1rem; color: rgba(255,255,255,0.8);
      margin-top: 12px; font-style: italic; max-width: 460px; line-height: 1.5;
    }
    .hero-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 5px;
      background: rgba(255,255,255,0.12); backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 20px; padding: 4px 14px; font-size: 0.78rem; color: white;
    }
    .accent-badge {
      background: ${accent}22; border: 1px solid ${accent}55; color: ${accent};
    }

    /* ── Stats row ── */
    .stats-section {
      max-width: 900px; margin: 0 auto;
      padding: 0 40px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: -28px;
      position: relative; z-index: 2;
    }
    @media (max-width: 680px) {
      .stats-section { grid-template-columns: repeat(2, 1fr); margin-top: 0; padding: 16px; }
      .hero-inner { grid-template-columns: 1fr; text-align: center; }
    }
    @media print {
      @page { size: A4 portrait; margin: 8mm 10mm; }
      html {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        font-size: 11px;
      }
      body { zoom: 0.58; margin: 0; }
      /* Prevent sections from splitting across pages */
      .hero, .stats-section, .card, .stat-card, .cta-section, .two-col > div {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .section-head { break-after: avoid; page-break-after: avoid; }
      .hero::after { display: none; }
      .hero-inner { padding: 24px; gap: 18px; }
      .avatar { width: 88px; height: 88px; font-size: 30px; }
      .hero-info h1 { font-size: 1.75rem; }
      .hero-tagline { margin-top: 5px; }
      .hero-badges { margin-top: 7px; }
      .stats-section { padding: 0 24px; gap: 8px; margin-top: -18px; }
      .stat-card { padding: 12px 8px; box-shadow: none; border-radius: 10px; }
      .stat-value { font-size: 1.3rem; }
      .main { padding: 18px 24px; }
      .section-head { margin-top: 16px; margin-bottom: 10px; }
      .card { padding: 12px; border-radius: 12px; }
      .two-col { gap: 10px; }
      .cta-section { padding: 24px 20px; margin-top: 18px; border-radius: 14px; }
      .cta-section h2 { font-size: 1.2rem; }
      .footer { margin-top: 18px; padding-bottom: 14px; }
      .services-grid { gap: 5px; }
      .service-item { padding: 7px 10px; }
      .partners-grid { gap: 5px; }
      .partner-item { padding: 5px 12px; }
    }
    .stat-card {
      background: #ffffff;
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 24px 18px;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      position: relative; overflow: hidden;
    }
    .stat-card::before {
      content:''; position:absolute; top:0; left:0; right:0; height:2px;
      background: ${gradient};
    }
    .stat-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: ${primary}22; border: 1px solid ${primary}44;
      display: flex; align-items: center; justify-content: center;
      color: ${accent}; margin-bottom: 12px;
    }
    .stat-value {
      font-size: 2rem; font-weight: 800; color: #1a1a2e;
      font-family: '${titleFont}', serif; line-height: 1;
    }
    .stat-label {
      font-size: 0.68rem; color: var(--text-muted); margin-top: 6px;
      text-transform: uppercase; letter-spacing: 1px;
    }

    /* ── Main content ── */
    .main { max-width: 900px; margin: 0 auto; padding: 32px 40px 80px; }

    /* ── Section header ── */
    .section-head {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 20px; margin-top: 36px;
    }
    .section-head h2 {
      font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 2.5px; color: ${accent};
    }
    .section-head::after {
      content:''; flex:1; height:1px; background: var(--card-border);
    }

    /* ── Two-column grid ── */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

    /* ── Card ── */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px; padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    }
    .card-title {
      font-size: 0.8rem; font-weight: 600; color: var(--text-dim);
      margin-bottom: 18px; display: flex; align-items: center; gap: 6px;
    }

    /* ── Engagement ring card ── */
    .rings-row { display: flex; align-items: center; justify-content: space-around; }

    /* ── Horizontal bar ── */
    .bar-row { margin-bottom: 12px; }
    .bar-label {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.78rem; color: var(--text-dim); margin-bottom: 5px;
    }
    .bar-track {
      height: 8px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden;
    }
    .bar-fill {
      height: 100%; border-radius: 4px;
      background: ${gradient};
      transition: width 0.3s ease;
    }
    .bar-fill-accent {
      background: linear-gradient(90deg, ${accent}aa, ${accent});
    }

    /* ── Country pills ── */
    .country-grid { display: flex; flex-direction: column; gap: 10px; }
    .country-row { display: flex; align-items: center; gap: 10px; }
    .country-flag { font-size: 1.2rem; }
    .country-name { font-size: 0.82rem; color: var(--text-dim); flex: 1; }
    .country-pct {
      font-size: 0.82rem; font-weight: 700; color: #1a1a2e; min-width: 36px; text-align: right;
    }
    .country-bar-wrap { flex: 2; }

    /* ── Content type table ── */
    .content-row {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 0; border-bottom: 1px solid var(--card-border);
    }
    .content-row:last-child { border-bottom: none; }
    .content-type { font-size: 0.8rem; color: var(--text-dim); min-width: 70px; }
    .content-bar-wrap { flex: 1; }
    .content-bar {
      height: 6px; border-radius: 3px; overflow: hidden;
      background: rgba(0,0,0,0.06);
    }
    .content-bar-inner {
      height: 100%; border-radius: 3px;
      background: linear-gradient(90deg, ${primary}, ${accent});
    }
    .content-er {
      font-size: 0.75rem; font-weight: 700; color: ${accent}; min-width: 40px; text-align: right;
    }
    .content-count {
      font-size: 0.68rem; color: var(--text-muted); min-width: 40px; text-align: right;
    }

    /* ── Gender donut card ── */
    .gender-row { display: flex; align-items: center; gap: 16px; }
    .gender-legend { display: flex; flex-direction: column; gap: 8px; }
    .gender-dot {
      width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px;
    }

    /* ── Services ── */
    .services-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
    }
    .service-item {
      display: flex; align-items: center; gap: 10px;
      background: var(--card-bg); border: 1px solid var(--card-border);
      border-radius: 12px; padding: 12px 16px;
      font-size: 0.85rem; color: var(--text-dim);
    }
    .service-check {
      width: 20px; height: 20px; border-radius: 6px;
      background: ${accent}22; border: 1px solid ${accent}55;
      display: flex; align-items: center; justify-content: center;
      color: ${accent}; flex-shrink: 0;
    }

    /* ── Partners ── */
    .partners-grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .partner-item {
      display: flex; align-items: center; gap: 8px;
      background: var(--card-bg); border: 1px solid var(--card-border);
      border-radius: 12px; padding: 10px 20px;
      font-size: 0.85rem; font-weight: 600; color: var(--text-dim);
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .partner-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: ${accent}; flex-shrink: 0;
    }

    /* ── CTA ── */
    .cta-section {
      margin-top: 40px;
      background: ${gradient};
      border-radius: 24px; padding: 48px 40px;
      text-align: center; position: relative; overflow: hidden;
    }
    .cta-section::before {
      content:''; position:absolute; inset:0;
      background: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='40' fill='none' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.05'/%3E%3C/svg%3E") center/cover;
      pointer-events: none;
    }
    .cta-section h2 {
      font-family: '${titleFont}', serif;
      font-size: 1.8rem; font-weight: 800; color: white; position: relative;
    }
    .cta-section p { color: rgba(255,255,255,0.75); margin-top: 10px; position: relative; }
    .cta-email-btn {
      display: inline-flex; align-items: center; gap: 8px;
      margin-top: 24px;
      background: white; color: ${primary};
      font-weight: 700; padding: 13px 36px; border-radius: 50px;
      text-decoration: none; font-size: 0.95rem; position: relative;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .rate-pill {
      display: inline-block; margin-top: 14px;
      background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
      border-radius: 50px; padding: 6px 20px;
      font-size: 0.85rem; color: white; position: relative;
    }

    /* ── Footer ── */
    .footer {
      text-align: center; color: var(--text-muted); font-size: 0.72rem; margin-top: 48px;
      padding-bottom: 32px;
    }
    .footer span { color: ${accent}; }
  </style>
</head>
<body>

  <!-- ── HERO ── -->
  <div class="hero">
    <div class="hero-inner">
      <div class="avatar-wrap">
        <div class="avatar">${
          config.profilePicUrl
            ? `<img src="${config.profilePicUrl}" alt="@${profile.username}" />`
            : profile.username.charAt(0).toUpperCase()
        }</div>
      </div>
      <div class="hero-info">
        <h1>${config.displayName || profile.fullName || profile.username}</h1>
        <div class="hero-handle">@${profile.username}${profile.isVerified ? " ✓" : ""}</div>
        ${profile.website ? `<div class="hero-handle" style="margin-top:3px;font-size:0.82rem;opacity:0.7">${ICON.globe} ${profile.website}</div>` : ""}
        <div class="hero-tagline">${config.tagline}</div>
        <div class="hero-badges">
          <span class="hero-badge">${ICON.users} ${fmtNum(profile.followerCount)} ${L.followers}</span>
          ${config.ratePerPost ? `<span class="hero-badge accent-badge">💰 ${L.from} ${config.ratePerPost} ${L.perPost}</span>` : ""}
        </div>
      </div>
    </div>
  </div>

  <!-- ── STATS ROW ── -->
  <div class="stats-section">
    <div class="stat-card">
      <div class="stat-icon">${ICON.users}</div>
      <div class="stat-value">${fmtNum(profile.followerCount)}</div>
      <div class="stat-label">${L.followers}</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">${ICON.trending}</div>
      <div class="stat-value">${engagement.toFixed(2)}%</div>
      <div class="stat-label">${L.engagementRate}</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">${ICON.eye}</div>
      <div class="stat-value">${fmtNum(reach)}</div>
      <div class="stat-label">${L.reach}</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">${ICON.image}</div>
      <div class="stat-value">${fmtNum(impressions)}</div>
      <div class="stat-label">${L.impressions}</div>
    </div>
  </div>

  <!-- ── MAIN CONTENT ── -->
  <div class="main">

    <!-- Engagement & Performance -->
    <div class="section-head"><h2>${L.performance}</h2></div>
    <div class="two-col">

      <!-- Engagement rings -->
      <div class="card">
        <div class="card-title">${ICON.trending} ${L.keyMetrics}</div>
        <div class="rings-row">
          ${erRing}
          ${
            nonFollowerRing ||
            `<div style="text-align:center">
            <div style="font-size:1.6rem;font-weight:800;color:#1a1a2e;">${fmtNum(metrics.avgLikesPerPost)}</div>
            <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">${L.avgLikes}</div>
          </div>`
          }
          <div style="text-align:center">
            <div style="font-size:1.6rem;font-weight:800;color:#1a1a2e;">${fmtNum(metrics.avgCommentsPerPost)}</div>
            <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">${L.comments}</div>
          </div>
        </div>
      </div>

      <!-- Content type performance -->
      <div class="card">
        <div class="card-title">${ICON.image} ${L.contentFormats}</div>
        ${sortedContent
          .slice(0, 5)
          .map(
            (ct) => `
        <div class="content-row">
          <div class="content-type">${ct.type}</div>
          <div class="content-bar-wrap">
            <div class="content-bar">
              <div class="content-bar-inner" style="width:${Math.min(100, (ct.engagementRate / maxER) * 100).toFixed(0)}%"></div>
            </div>
          </div>
          <div class="content-er">${ct.engagementRate.toFixed(1)}%</div>
          <div class="content-count">${ct.count} ${L.posts}</div>
        </div>`
          )
          .join("")}
        ${sortedContent.length === 0 ? `<div style="color:var(--text-muted);font-size:0.82rem">${L.noData}</div>` : ""}
      </div>
    </div>

    <!-- Audience -->
    <div class="section-head"><h2>${L.audience}</h2></div>
    <div class="two-col">

      <!-- Location -->
      <div class="card">
        <div class="card-title">${ICON.globe} ${L.location}</div>
        ${
          topCountries.length > 0
            ? `
        <div class="country-grid">
          ${topCountries
            .map(
              ([country, pct]) => `
          <div class="country-row">
            <div class="country-name">${country}</div>
            <div class="country-bar-wrap">
              <div class="bar-track">
                <div class="bar-fill" style="width:${Math.min(100, pct).toFixed(0)}%"></div>
              </div>
            </div>
            <div class="country-pct">${pct}%</div>
          </div>`
            )
            .join("")}
        </div>
        ${
          topCities.length > 0
            ? `<div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:6px">
          ${topCities.map(([c, p]) => `<span style="background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:20px;padding:3px 12px;font-size:0.72rem;color:var(--text-dim)">📍 ${c} ${p}%</span>`).join("")}
        </div>`
            : ""
        }
        `
            : `<div style="color:var(--text-muted);font-size:0.82rem">${L.noDataAvailable}</div>`
        }
      </div>

      <!-- Demographics -->
      <div class="card">
        <div class="card-title">👥 ${L.demographics}</div>

        ${
          hasGender
            ? `
        <div class="gender-row" style="margin-bottom:20px">
          ${genderDonut}
          <div class="gender-legend">
            <div style="font-size:0.82rem;color:var(--text-dim)">
              <span class="gender-dot" style="background:${accent}"></span>${L.women} · <strong>${female.toFixed(0)}%</strong>
            </div>
            <div style="font-size:0.82rem;color:var(--text-dim)">
              <span class="gender-dot" style="background:${secondary}"></span>${L.men} · <strong>${male.toFixed(0)}%</strong>
            </div>
          </div>
        </div>`
            : ""
        }

        ${ageGroups
          .slice(0, 5)
          .map(
            ([group, pct]) => `
        <div class="bar-row">
          <div class="bar-label">
            <span>${group}</span>
            <span style="font-weight:700">${pct}%</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill bar-fill-accent" style="width:${Math.min(100, (pct / maxAgeVal) * 100).toFixed(0)}%"></div>
          </div>
        </div>`
          )
          .join("")}

        ${ageGroups.length === 0 && !hasGender ? `<div style="color:var(--text-muted);font-size:0.82rem">${L.noDataAvailable}</div>` : ""}
      </div>
    </div>

    <!-- Services -->
    ${
      config.services.length > 0
        ? `
    <div class="section-head"><h2>${L.services}</h2></div>
    <div class="services-grid">
      ${config.services
        .map(
          (s) => `
      <div class="service-item">
        <div class="service-check">${ICON.check}</div>
        ${s}
      </div>`
        )
        .join("")}
    </div>`
        : ""
    }

    <!-- Past Partnerships -->
    ${
      config.pastPartnerships && config.pastPartnerships.length > 0
        ? `
    <div class="section-head"><h2>${L.pastPartnerships}</h2></div>
    <div class="partners-grid">
      ${config.pastPartnerships
        .map(
          (p) => `
      <div class="partner-item">
        <div class="partner-dot"></div>
        ${p}
      </div>`
        )
        .join("")}
    </div>`
        : ""
    }

    <!-- CTA -->
    ${
      config.contactEmail
        ? `
    <div class="cta-section">
      <h2>${L.letsWorkTogether}</h2>
      <p>${L.ctaSubtitle}</p>
      <div>
        <a href="mailto:${config.contactEmail}" class="cta-email-btn">${ICON.mail} ${config.contactEmail}</a>
      </div>
      ${config.ratePerPost ? `<div class="rate-pill">💰 ${L.startingFrom} ${config.ratePerPost} / ${L.sponsoredPost}</div>` : ""}
    </div>`
        : ""
    }

    <div class="footer">
      <p>${L.dataFooter} · ${new Date().toLocaleDateString(config.lang === "fr" ? "fr-FR" : "en-GB")}</p>
      <p style="margin-top:4px">${L.generatedWith} <span>InstaInsights</span></p>
    </div>
  </div>

</body>
</html>`;
}
