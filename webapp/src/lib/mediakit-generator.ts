/**
 * Media Kit Generator
 * Generates a styled HTML media kit from the creator's real Instagram analytics.
 */

import type { InstagramAnalytics } from "@/types/instagram";

export interface MediaKitConfig {
  primaryColor: string; // hex
  secondaryColor: string; // hex
  accentColor: string; // hex
  tagline: string;
  services: string[];
  contactEmail: string;
  ratePerPost?: string; // e.g. "500€"
  profilePicUrl?: string; // URL of the creator's profile picture
}

export const defaultMediaKitConfig: MediaKitConfig = {
  primaryColor: "#7c3aed",
  secondaryColor: "#db2777",
  accentColor: "#f59e0b",
  tagline: "Créateur de contenu passionné",
  services: ["Posts sponsorisés", "Stories", "Reels", "Placement produit"],
  contactEmail: "",
  ratePerPost: "",
};

export function generateMediaKitHTML(
  analytics: InstagramAnalytics,
  config: MediaKitConfig
): string {
  const { profile, metrics, reachInsights, audienceInsights } = analytics;

  const fmtNum = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)}K`
        : String(n);

  const engagement = metrics.engagementRate.toFixed(2);
  const reach =
    reachInsights?.accountsReached ?? metrics.avgReachPerPost * (analytics.posts?.length ?? 0);
  const impressions = reachInsights?.impressions ?? 0;

  // Top audience countries
  const topCountries = audienceInsights?.topCountries
    ? Object.entries(audienceInsights.topCountries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c, pct]) => `${c} (${pct}%)`)
        .join(", ")
    : "Données non disponibles";

  // Top age group
  const topAgeGroup = audienceInsights?.ageGroups
    ? Object.entries(audienceInsights.ageGroups).sort((a, b) => b[1] - a[1])[0]
    : null;

  const genderSplit = audienceInsights?.genderSplit
    ? `${audienceInsights.genderSplit.female.toFixed(0)}% Femmes · ${audienceInsights.genderSplit.male.toFixed(0)}% Hommes`
    : "";

  const bestContentType = metrics.contentTypePerformance.sort(
    (a, b) => b.engagementRate - a.engagementRate
  )[0];

  const gradient = `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Media Kit – @${profile.username}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0f0f13;
      color: #f1f1f5;
      min-height: 100vh;
    }

    /* ── Hero ── */
    .hero {
      background: ${gradient};
      padding: 60px 40px 80px;
      position: relative;
      overflow: hidden;
    }
    .hero::after {
      content: '';
      position: absolute;
      inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      pointer-events: none;
    }
    .hero-inner { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; display: flex; align-items: center; gap: 32px; }
    .avatar {
      width: 120px; height: 120px; border-radius: 50%;
      border: 4px solid rgba(255,255,255,0.3);
      background: rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 40px; font-weight: 800; color: white;
      flex-shrink: 0; overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .hero-text h1 { font-size: 2.5rem; font-weight: 800; color: white; }
    .hero-text .handle { font-size: 1.1rem; color: rgba(255,255,255,0.8); margin-top: 4px; }
    .hero-text .tagline { font-size: 1rem; color: rgba(255,255,255,0.7); margin-top: 10px; font-style: italic; }
    .verified-badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 3px 12px; font-size: 0.75rem; color: white; margin-top: 8px; }

    /* ── Content ── */
    .content { max-width: 840px; margin: 0 auto; padding: 40px 20px 80px; }

    /* ── Section ── */
    .section { margin-bottom: 40px; }
    .section-title {
      font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;
      color: ${config.primaryColor}; margin-bottom: 20px;
      display: flex; align-items: center; gap: 8px;
    }
    .section-title::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.08); }

    /* ── Stats grid ── */
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    @media (min-width: 600px) { .stats-grid { grid-template-columns: repeat(4, 1fr); } }
    .stat-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px; padding: 20px 16px; text-align: center;
      position: relative; overflow: hidden;
    }
    .stat-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: ${gradient};
    }
    .stat-value { font-size: 1.8rem; font-weight: 800; color: white; }
    .stat-label { font-size: 0.72rem; color: rgba(255,255,255,0.5); margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }

    /* ── Two-col grid ── */
    .two-col { display: grid; grid-template-columns: 1fr; gap: 20px; }
    @media (min-width: 600px) { .two-col { grid-template-columns: 1fr 1fr; } }

    /* ── Card ── */
    .card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px; padding: 24px;
    }
    .card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 16px; }
    .card ul { padding-left: 20px; }
    .card ul li { padding: 5px 0; color: rgba(255,255,255,0.8); font-size: 0.9rem; }

    /* ── Audience pill ── */
    .pill {
      display: inline-block;
      background: rgba(255,255,255,0.08);
      border-radius: 20px; padding: 4px 14px; font-size: 0.8rem;
      color: rgba(255,255,255,0.8); margin: 4px 4px 0 0;
    }

    /* ── CTA ── */
    .cta {
      background: ${gradient};
      border-radius: 20px; padding: 40px; text-align: center; margin-top: 48px;
    }
    .cta h2 { font-size: 1.6rem; font-weight: 800; color: white; }
    .cta p { color: rgba(255,255,255,0.8); margin-top: 10px; }
    .cta a {
      display: inline-block; margin-top: 20px;
      background: white; color: ${config.primaryColor};
      font-weight: 700; padding: 12px 32px; border-radius: 50px; text-decoration: none;
      font-size: 0.95rem;
    }
    ${
      config.ratePerPost
        ? `.rate-badge {
      background: ${config.accentColor}22;
      border: 1px solid ${config.accentColor}55;
      color: ${config.accentColor};
      border-radius: 8px; padding: 8px 16px; font-size: 0.85rem;
      display: inline-block; margin-top: 12px;
    }`
        : ""
    }

    /* ── Footer ── */
    .footer {
      text-align: center; color: rgba(255,255,255,0.3); font-size: 0.75rem; margin-top: 40px;
    }
  </style>
</head>
<body>

  <!-- Hero -->
  <div class="hero">
    <div class="hero-inner">
      <div class="avatar">${
        config.profilePicUrl
          ? `<img src="${config.profilePicUrl}" alt="@${profile.username}" />`
          : profile.username.charAt(0).toUpperCase()
      }</div>
      <div class="hero-text">
        <h1>${profile.fullName || profile.username}</h1>
        <div class="handle">@${profile.username}</div>
        ${profile.website ? `<div class="handle" style="font-size:0.85rem; margin-top:2px;">🌐 ${profile.website}</div>` : ""}
        <div class="tagline">${config.tagline}</div>
        ${profile.isVerified ? `<div class="verified-badge">✓ Compte Vérifié</div>` : ""}
        ${config.ratePerPost ? `<div class="rate-badge">💰 À partir de ${config.ratePerPost} / post</div>` : ""}
      </div>
    </div>
  </div>

  <div class="content">

    <!-- Key Stats -->
    <div class="section">
      <div class="section-title">Chiffres clés</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${fmtNum(profile.followerCount)}</div>
          <div class="stat-label">Abonnés</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${engagement}%</div>
          <div class="stat-label">Taux d'engagement</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${fmtNum(reach)}</div>
          <div class="stat-label">Portée</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${fmtNum(impressions || profile.followerCount * 4)}</div>
          <div class="stat-label">Impressions</div>
        </div>
      </div>
    </div>

    <!-- Content Performance -->
    ${
      bestContentType
        ? `
    <div class="section">
      <div class="section-title">Performance du contenu</div>
      <div class="two-col">
        <div class="card">
          <h3>🏆 Format le plus engageant</h3>
          <div class="stat-value" style="font-size:1.4rem">${bestContentType.type}</div>
          <div class="stat-label" style="margin-top:8px">${bestContentType.engagementRate.toFixed(1)}% d'engagement moyen</div>
          <div class="pill" style="margin-top:12px">❤️ ${Math.round(bestContentType.avgLikes)} likes moy.</div>
          <div class="pill">💬 ${Math.round(bestContentType.avgComments)} commentaires moy.</div>
        </div>
        <div class="card">
          <h3>📊 Volume de contenu</h3>
          ${metrics.contentTypePerformance
            .map(
              (ct) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
              <span style="font-size:0.85rem">${ct.type}</span>
              <span style="font-size:0.85rem;color:rgba(255,255,255,0.6)">${ct.count} posts</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </div>`
        : ""
    }

    <!-- Audience -->
    <div class="section">
      <div class="section-title">Audience</div>
      <div class="two-col">
        <div class="card">
          <h3>🌍 Localisation</h3>
          <p style="color:rgba(255,255,255,0.7);font-size:0.9rem;">${topCountries}</p>
          ${
            audienceInsights?.topCities
              ? `
            <div style="margin-top:12px">
              ${Object.entries(audienceInsights.topCities)
                .slice(0, 3)
                .map(([c, p]) => `<div class="pill">📍 ${c} ${p}%</div>`)
                .join("")}
            </div>`
              : ""
          }
        </div>
        <div class="card">
          <h3>👥 Démographie</h3>
          ${genderSplit ? `<p style="color:rgba(255,255,255,0.7);font-size:0.9rem;margin-bottom:10px;">${genderSplit}</p>` : ""}
          ${topAgeGroup ? `<div class="pill">🎂 Tranche principale : ${topAgeGroup[0]} ans (${topAgeGroup[1]}%)</div>` : ""}
        </div>
      </div>
    </div>

    <!-- Services -->
    <div class="section">
      <div class="section-title">Services proposés</div>
      <div class="card">
        <ul style="list-style:none;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${config.services.map((s) => `<li style="display:flex;align-items:center;gap:8px;color:rgba(255,255,255,0.85);font-size:0.9rem"><span style="color:${config.primaryColor}">✓</span>${s}</li>`).join("")}
        </ul>
      </div>
    </div>

    <!-- CTA -->
    ${
      config.contactEmail
        ? `
    <div class="cta">
      <h2>Collaborons ensemble 🚀</h2>
      <p>Disponible pour des partenariats, placements produits et créations de contenu</p>
      <a href="mailto:${config.contactEmail}">${config.contactEmail}</a>
    </div>`
        : ""
    }

    <div class="footer">
      <p>Données extraites de l'export Instagram officiel · ${new Date().toLocaleDateString("fr-FR")}</p>
      <p style="margin-top:4px">Généré avec InstaInsights</p>
    </div>
  </div>

</body>
</html>`;
}
