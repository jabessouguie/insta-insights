import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences } from "@/lib/ai-provider";
import type { InstagramProfile } from "@/types/instagram";

export const dynamic = "force-dynamic";

export interface BrandPitchRequest {
  brandName: string;
  profile: Partial<InstagramProfile>;
  language?: "fr" | "en";
  model?: string;
  posts?: { caption: string }[];
  topCountries?: string[];
  audienceGender?: { female?: number; male?: number };
  engagementRate?: number;
  followerCount?: number;
}

export interface BrandPitchResponse {
  success: boolean;
  data?: {
    email: { subject: string; body: string };
    mediaKit: { tagline: string; services: string[]; ratePerPost: string };
    brandInfo: { niche: string; type: string; instagramHandle?: string; contactEmail?: string };
  };
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<BrandPitchResponse>> {
  try {
    const body: BrandPitchRequest = await request.json();
    const {
      brandName,
      profile,
      language = "fr",
      posts = [],
      topCountries = [],
      audienceGender,
      engagementRate,
      followerCount,
      model,
    } = body;

    if (!brandName?.trim()) {
      return NextResponse.json({ success: false, error: "Missing brandName" }, { status: 400 });
    }

    if (!isAIConfigured()) {
      return NextResponse.json(
        { success: false, error: "No AI provider configured" },
        { status: 501 }
      );
    }

    const lang = language === "fr" ? "français" : "English";
    const followers = (followerCount ?? profile.followerCount ?? 0).toLocaleString("fr-FR");
    const er = (engagementRate ?? 0).toFixed(2);

    const recentCaptions = posts
      .filter((p) => p.caption?.trim())
      .slice(0, 5)
      .map((p) => `- "${p.caption.slice(0, 120)}"`)
      .join("\n");

    const prompt = `Tu es un expert en marketing d'influence. Un créateur Instagram veut envoyer un pitch complet (email + media kit adapté) à la marque "${brandName}".

### Profil créateur
- Username: @${profile.username ?? "creator"}
- Abonnés: ${followers}
- Taux d'engagement: ${er}%
- Bio: "${profile.bio ?? ""}"
- Top pays audience: ${topCountries.join(", ") || "N/A"}
- Genre audience: ${audienceGender ? `${audienceGender.female ?? 0}% femmes / ${audienceGender.male ?? 0}% hommes` : "N/A"}
${recentCaptions ? `- Exemples de captions récentes:\n${recentCaptions}` : ""}

### Ta mission
1. Analyse la marque "${brandName}" — déduis sa niche, son type (brand/media/event/creator), son handle Instagram probable et son email de contact probable.
2. Rédige un email de pitch professionnel en ${lang} (200–300 mots) :
   - Objet accrocheur (< 60 chars)
   - Commence par expliquer comment le créateur a découvert la marque (pas de relation fictive existante)
   - Présente le créateur et ses stats clés
   - Propose 2-3 formats de collaboration concrets adaptés à la niche de la marque
   - Mentionne "Vous trouverez mon media kit en pièce jointe de cet email" vers la fin
   - Call-to-action clair
3. Génère un tagline et des services pour le media kit adaptés spécifiquement à cette marque.

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{
  "email": {
    "subject": "Objet de l'email",
    "body": "Corps complet de l'email"
  },
  "mediaKit": {
    "tagline": "Tagline adapté à la marque (1 phrase percutante)",
    "services": ["Service 1 adapté", "Service 2 adapté", "Service 3 adapté"],
    "ratePerPost": "fourchette tarifaire réaliste selon les stats"
  },
  "brandInfo": {
    "niche": "niche principale de la marque",
    "type": "brand|media|event|creator",
    "instagramHandle": "@handle si connu ou probable",
    "contactEmail": "email de contact probable (ex: partenariats@brand.com)"
  }
}`;

    const raw = await generateText(prompt, { model });
    const clean = stripJsonFences(raw);
    const parsed = JSON.parse(clean) as BrandPitchResponse["data"];

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Error in /api/collabs/brand-pitch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate brand pitch" },
      { status: 500 }
    );
  }
}
