import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { InstagramProfile } from "@/types/instagram";

export const dynamic = "force-dynamic";

export interface CollabMatch {
  id: string;
  name: string;
  type: "brand" | "creator" | "event" | "media";
  niche: string;
  location: string;
  reason: string;
  instagramHandle?: string;
  websiteHint?: string;
  potentialRevenue?: string;
}

export interface CollabFinderRequest {
  location: string;
  interests: string[];
  profile: Partial<InstagramProfile>;
}

export interface CollabFinderResponse {
  success: boolean;
  data?: { collabs: CollabMatch[]; summary: string };
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<CollabFinderResponse>> {
  try {
    const body: CollabFinderRequest = await request.json();
    const { location, interests, profile } = body;

    if (!location || !interests?.length) {
      return NextResponse.json(
        { success: false, error: "Missing location or interests" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API key not configured" },
        { status: 501 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use Pro for deeper reasoning and more relevant research
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const followers = profile.followerCount ?? 0;
    const tier =
      followers < 5_000
        ? "nano-influencer (< 5K abonnés) — collabs locales, échanges produits, micro-marques"
        : followers < 20_000
          ? "micro-influencer (5K–20K abonnés) — partenariats rémunérés régionaux, marques mid-range"
          : followers < 100_000
            ? "influencer (20K–100K abonnés) — partenariats rémunérés nationaux, marques connues"
            : "macro-influencer (100K+ abonnés) — grands comptes, agences, contrats significatifs";

    const prompt = `Tu es un expert senior en marketing d'influence et développement commercial pour créateurs de contenu.

Un créateur Instagram cherche des opportunités de collaboration concrètes et réalistes.

### Profil détaillé du créateur
- Username: @${profile.username ?? "creator"}
- Abonnés: ${followers.toLocaleString("fr-FR")} → ${tier}
- Bio Instagram: "${profile.bio ?? "N/A"}"
- Localisation déclarée: ${location}
- Centres d'intérêt / niche: ${interests.join(", ")}

### Ta mission
Identifie exactement 6 opportunités de collaboration **réalistes et adaptées à son profil** dans ou autour de "${location}".

Règles importantes :
1. Calibre les suggestions au niveau du créateur — une suggestion irréaliste (ex: Nike pour un profil à 1 200 abonnés) est inutile.
2. Déduis sa niche principale depuis sa bio et ses centres d'intérêt, puis cherche des partenaires dans cette niche.
3. Mélange les types : marques locales indépendantes, créateurs complémentaires dans la même niche, événements locaux, médias/blogs locaux.
4. Pour les marques, donne des noms réalistes et vérifiables (marques existantes, pas fictives).
5. Le potentialRevenue doit être cohérent avec la taille du compte et le marché local.
6. La raison doit expliquer concrètement pourquoi leurs audiences se recoupent.

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{
  "summary": "Résumé en 2 phrases des opportunités identifiées, mention du tier du créateur",
  "collabs": [
    {
      "id": "1",
      "name": "Nom réel de la marque/créateur/événement",
      "type": "brand|creator|event|media",
      "niche": "niche spécifique en commun",
      "location": "ville/région précise",
      "reason": "Pourquoi c'est pertinent pour CE créateur avec CES abonnés dans CETTE niche (2 phrases)",
      "instagramHandle": "@handle Instagram si connu",
      "websiteHint": "nom de domaine probable ou terme de recherche",
      "potentialRevenue": "fourchette réaliste selon le tier (ex: échange produit, 50-150€, 300-800€)"
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response
      .text()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(raw);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Error in /api/collabs:", error);
    return NextResponse.json({ success: false, error: "Failed to find collabs" }, { status: 500 });
  }
}
