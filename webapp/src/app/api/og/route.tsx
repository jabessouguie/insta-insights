import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Dynamic Open Graph image generator.
 *
 * Query params:
 *   ?title=Custom+Title   — override headline (default: "Analytics Instagram IA")
 *   ?page=pricing         — preset pages with specific subtitles
 *
 * Usage in metadata:
 *   openGraph: { images: [{ url: "/api/og", width: 1200, height: 630 }] }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page = searchParams.get("page") ?? "home";
  const customTitle = searchParams.get("title");

  const PAGE_PRESETS: Record<string, { title: string; subtitle: string }> = {
    home: {
      title: "Analytics Instagram IA",
      subtitle: "Transformez votre export Instagram en insights actionnables.",
    },
    pricing: {
      title: "Tarifs — Free, Pro & Agency",
      subtitle: "Commencez gratuitement. Évoluez sans limite.",
    },
    help: {
      title: "Centre d'aide",
      subtitle: "Guides, tutoriels et FAQ pour bien démarrer.",
    },
  };

  const preset = PAGE_PRESETS[page] ?? PAGE_PRESETS.home;
  const title = customTitle ?? preset.title;
  const subtitle = preset.subtitle;

  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        background: "#111c1b",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow top-right */}
      <div
        style={{
          position: "absolute",
          top: "-120px",
          right: "-120px",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,217,83,0.12) 0%, transparent 70%)",
        }}
      />
      {/* Background glow bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: "-80px",
          left: "-80px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(92,145,164,0.10) 0%, transparent 70%)",
        }}
      />

      {/* Border frame */}
      <div
        style={{
          position: "absolute",
          inset: "24px",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "24px",
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          padding: "64px 80px",
        }}
      >
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(255,217,83,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255,217,83,0.2)",
            }}
          >
            {/* Trend-up icon simplified */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <polyline
                points="23 6 13.5 15.5 8.5 10.5 1 18"
                stroke="#ffd953"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="17 6 23 6 23 12"
                stroke="#ffd953"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span style={{ color: "#ffffff", fontSize: "20px", fontWeight: "700" }}>
            InstaInsights
          </span>
        </div>

        {/* Main text */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Badge */}
          <div
            style={{
              display: "flex",
              width: "fit-content",
              padding: "6px 16px",
              borderRadius: "100px",
              background: "rgba(255,217,83,0.08)",
              border: "1px solid rgba(255,217,83,0.2)",
              color: "#ffd953",
              fontSize: "13px",
              fontWeight: "600",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Alimenté par Gemini AI · 100% RGPD
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: title.length > 30 ? "52px" : "62px",
              fontWeight: "800",
              color: "#ffffff",
              lineHeight: "1.1",
              letterSpacing: "-0.02em",
              maxWidth: "860px",
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: "22px",
              color: "rgba(207,203,186,0.65)",
              lineHeight: "1.5",
              maxWidth: "720px",
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "24px" }}>
            {["Gratuit sans CB", "Données 100% locales", "IA multi-provider"].map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "rgba(207,203,186,0.5)",
                  fontSize: "14px",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#5c91a4",
                  }}
                />
                {tag}
              </div>
            ))}
          </div>
          <div style={{ color: "rgba(207,203,186,0.3)", fontSize: "14px" }}>instainsights.app</div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
