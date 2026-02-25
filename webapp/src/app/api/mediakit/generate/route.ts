import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

const MODEL_NAME = "nano-banana-pro-preview";

export interface MediaKitGenerateRequest {
  username: string;
  followerCount: number;
  engagementRate: number;
  bio?: string;
  contactEmail?: string;
  topContentType?: string;
  audienceGender?: { female: number; male: number };
  topCountries?: string[];
  posts?: Array<{ caption: string }>;
}

export interface MediaKitGenerateResponse {
  success: boolean;
  tagline?: string;
  services?: string[];
  ratePerPost?: string;
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<MediaKitGenerateResponse>> {
  try {
    const body: MediaKitGenerateRequest = await request.json();
    const {
      username,
      followerCount,
      engagementRate,
      bio,
      contactEmail,
      topContentType,
      audienceGender,
      topCountries,
      posts,
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        tagline: `Créateur de contenu · ${followerCount.toLocaleString("fr-FR")} abonnés`,
        services: ["Posts sponsorisés", "Stories", "Reels", "Placement produit", "UGC"],
        ratePerPost: followerCount >= 10000 ? "500€" : "150€",
      });
    }

    const followerTier =
      followerCount < 5_000
        ? "nano (<5k)"
        : followerCount < 10_000
          ? "nano (5k–10k)"
          : followerCount < 50_000
            ? "micro (10k–50k)"
            : followerCount < 200_000
              ? "mid-tier (50k–200k)"
              : "macro (>200k)";

    const captionsSample =
      posts
        ?.filter((p) => p.caption.trim().length > 0)
        .slice(0, 10)
        .map((p, i) => `${i + 1}. "${p.caption.substring(0, 150)}"`)
        .join("\n") ?? "";

    const genderStr = audienceGender
      ? `${audienceGender.female}% femmes · ${audienceGender.male}% hommes`
      : null;

    const prompt = `Tu es un expert en personal branding et marketing d'influence pour créateurs Instagram francophones.

Génère le contenu texte pour le media kit d'un créateur Instagram.

### Créateur
- Username : @${username}
- Abonnés : ${followerCount.toLocaleString("fr-FR")} (${followerTier})
- Taux d'engagement : ${engagementRate.toFixed(2)}%
- Format de contenu le plus performant : ${topContentType ?? "N/A"}
${bio ? `- Bio Instagram : "${bio}"` : ""}
${contactEmail ? `- Email de contact : ${contactEmail}` : ""}
${genderStr ? `- Audience : ${genderStr}` : ""}
${topCountries?.length ? `- Marchés principaux : ${topCountries.join(", ")}` : ""}
${captionsSample ? `\n### Captions récentes (pour identifier la niche)\n${captionsSample}` : ""}

### Instructions
1. Identifie la niche du créateur à partir des captions et de la bio.
2. Génère une **tagline** percutante (max 10 mots) qui reflète la niche et le style du créateur.
3. Génère une liste de **5 à 7 services** proposés, pertinents pour cette niche (ex: "Reels sponsorisés", "Test produit en story", "Code promo dédié", "Haul vidéo", "UGC authentique"...).
4. Suggère un **tarif indicatif par post** réaliste pour ce tier d'influenceur sur le marché français.

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{
  "tagline": "Tagline percutante ici",
  "services": ["Service 1", "Service 2", "Service 3", "Service 4", "Service 5"],
  "ratePerPost": "XXX€"
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    const text = result.response
      .text()
      .trim()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(text) as {
      tagline: string;
      services: string[];
      ratePerPost: string;
    };

    return NextResponse.json({
      success: true,
      tagline: parsed.tagline,
      services: parsed.services,
      ratePerPost: parsed.ratePerPost,
    });
  } catch (error) {
    console.error("Error in /api/mediakit/generate:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la génération du media kit" },
      { status: 500 }
    );
  }
}
