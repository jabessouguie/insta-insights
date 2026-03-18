/**
 * Guide Generator
 *
 * Converts a GuideConfig (title, sections, photos, author) into a
 * self-contained HTML document styled for both screen preview and
 * print-to-PDF via the browser's native print dialog.
 *
 * Same approach as mediakit-generator.ts — no external PDF library needed.
 */

import type { GuideConfig } from "@/types/instagram";

export const DEFAULT_GUIDE_CONFIG: GuideConfig = {
  title: "",
  subtitle: "",
  type: "general",
  authorName: "",
  accentColor: "#6366f1",
  sections: [{ title: "", content: "" }],
  photos: [],
};

const TYPE_LABELS: Record<string, string> = {
  travel: "Guide Voyage",
  tutorial: "Tutoriel",
  recipe: "Recette",
  tips: "Conseils",
  general: "Guide",
};

/**
 * Escape HTML special characters to prevent XSS in generated documents.
 */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert newlines to <br> for multi-line content */
function nl2br(str: string): string {
  return esc(str).replace(/\n/g, "<br>");
}

/**
 * Generate a complete, self-contained HTML guide document.
 *
 * @param config - Guide configuration including sections and photos
 * @returns Full HTML string ready to be opened in a new tab and printed
 */
export function generateGuideHTML(config: GuideConfig): string {
  const accent = config.accentColor ?? "#6366f1";
  const author = config.authorName ? esc(config.authorName) : "";
  const typeLabel = TYPE_LABELS[config.type] ?? "Guide";
  const photos = config.photos ?? [];

  const sectionsHtml = config.sections
    .filter((s) => s.title.trim() || s.content.trim())
    .map((section, idx) => {
      const photo =
        section.photoIndex !== undefined && section.photoIndex >= 0
          ? (photos[section.photoIndex] ?? null)
          : null;
      const photoHtml = photo
        ? `<div class="section-photo"><img src="${photo}" alt="${esc(section.title)}" /></div>`
        : "";
      const isEven = idx % 2 === 1;
      return `
    <section class="guide-section${isEven ? " section-alt" : ""}">
      ${photoHtml}
      <div class="section-text">
        <div class="section-number">${String(idx + 1).padStart(2, "0")}</div>
        <h2 class="section-title">${esc(section.title)}</h2>
        <p class="section-content">${nl2br(section.content)}</p>
      </div>
    </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(config.title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --accent: ${accent};
      --text: #1a1a2e;
      --muted: #6b7280;
      --bg: #ffffff;
      --section-bg: #f9fafb;
      --border: #e5e7eb;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }

    /* ── Cover ── */
    .cover {
      min-height: 280px;
      background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, #000) 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 48px 56px 40px;
      position: relative;
      overflow: hidden;
    }
    .cover::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%);
    }
    .cover-badge {
      display: inline-block;
      background: rgba(255,255,255,0.25);
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 100px;
      padding: 4px 14px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 16px;
      width: fit-content;
    }
    .cover-title {
      font-size: 2.8rem;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.02em;
      max-width: 680px;
    }
    .cover-subtitle {
      margin-top: 12px;
      font-size: 1.1rem;
      opacity: 0.85;
      max-width: 560px;
    }
    .cover-author {
      margin-top: 24px;
      font-size: 0.85rem;
      opacity: 0.75;
    }

    /* ── Sections ── */
    .guide-section {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0;
      border-bottom: 1px solid var(--border);
    }
    .guide-section.section-alt { background: var(--section-bg); }

    .section-photo img {
      width: 100%;
      height: 280px;
      object-fit: cover;
      display: block;
    }

    .section-text {
      padding: 40px 56px;
      position: relative;
    }

    .section-number {
      font-size: 3.5rem;
      font-weight: 900;
      color: var(--accent);
      opacity: 0.15;
      line-height: 1;
      margin-bottom: -16px;
      font-variant-numeric: tabular-nums;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 14px;
      letter-spacing: -0.01em;
    }

    .section-content {
      font-size: 0.975rem;
      color: #374151;
      line-height: 1.75;
      max-width: 680px;
    }

    /* ── Footer ── */
    .guide-footer {
      padding: 28px 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 2px solid var(--accent);
      background: var(--bg);
    }
    .guide-footer-author {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text);
    }
    .guide-footer-meta {
      font-size: 0.75rem;
      color: var(--muted);
    }

    /* ── Print ── */
    @media print {
      @page { size: A4 portrait; margin: 12mm 14mm; }
      html {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        font-size: 11px;
      }
      body { zoom: 0.85; }
      .cover { min-height: 220px; padding: 36px 40px 28px; }
      .cover-title { font-size: 2.2rem; }
      .section-text { padding: 28px 40px; }
      .section-photo img { height: 220px; }
      .guide-section, .section-text, .section-photo {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .cover { break-after: page; page-break-after: always; }
      .guide-footer { margin-top: 8px; padding: 20px 40px; }
    }
  </style>
  <script>
    window.addEventListener('load', () => window.print());
  </script>
</head>
<body>
  <div class="cover">
    <div class="cover-badge">${typeLabel}</div>
    <h1 class="cover-title">${esc(config.title)}</h1>
    ${config.subtitle ? `<p class="cover-subtitle">${esc(config.subtitle)}</p>` : ""}
    ${author ? `<p class="cover-author">Par ${author}</p>` : ""}
  </div>

  ${sectionsHtml}

  <footer class="guide-footer">
    ${author ? `<span class="guide-footer-author">${author}</span>` : "<span></span>"}
    <span class="guide-footer-meta">${typeLabel} · ${new Date().getFullYear()}</span>
  </footer>
</body>
</html>`;
}
