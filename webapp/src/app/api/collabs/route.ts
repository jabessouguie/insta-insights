import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences, GEMINI_PRO } from "@/lib/ai-provider";
import type { InstagramProfile } from "@/types/instagram";

export const dynamic = "force-dynamic";

export interface CollabMatch {
  id: string;
  name: string;
  /**
   * Category of the collaboration partner.
   * - brand    : commercial brand or local shop
   * - creator  : complementary content creator
   * - event    : festival, exhibition, conference
   * - media    : blog, magazine, podcast
   * - hotel    : accommodation (hotel, hostel, gîte, camping)
   * - excursion: day-trip or activity company (boat tours, guided hikes, escape rooms, …)
   */
  type: "brand" | "creator" | "event" | "media" | "hotel" | "excursion";
  niche: string;
  location: string;
  reason: string;
  instagramHandle?: string;
  websiteHint?: string;
  potentialRevenue?: string;
  contactEmail?: string;
  /** Relevance score 1–10 (10 = most relevant). Used for client-side sorting. */
  relevanceScore?: number;
  /**
   * Suggested collaboration formats for this partner (AI-generated).
   * Used for client-side filtering.
   */
  collabFormats?: Array<
    "partenariat" | "nuitee_offerte" | "code_promo" | "sponsorise" | "ugc" | "ambassador"
  >;
}

export interface CollabFinderRequest {
  location: string;
  interests: string[];
  profile: Partial<InstagramProfile>;
  /** Names of collabs to avoid re-suggesting (already contacted or not interested) */
  excludeNames?: string[];
  /** How many results to return (default 15, no upper limit) */
  count?: number;
  /**
   * UI language. Drives the language of all free-text fields in the response
   * (reason, summary, potentialRevenue, …).
   */
  language?: "fr" | "en";
}

export interface CollabFinderResponse {
  success: boolean;
  data?: { collabs: CollabMatch[]; summary: string };
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<CollabFinderResponse>> {
  try {
    const body: CollabFinderRequest = await request.json();
    const { location, interests, profile, excludeNames = [], count = 15, language = "fr" } = body;
    const n = Math.max(1, Math.min(count, 100)); // cap at 100 for sanity

    if (!location || !interests?.length) {
      return NextResponse.json(
        { success: false, error: "Missing location or interests" },
        { status: 400 }
      );
    }

    if (!isAIConfigured()) {
      return NextResponse.json(
        { success: false, error: "No AI provider configured" },
        { status: 501 }
      );
    }

    const followers = profile.followerCount ?? 0;

    // Tier labels are bilingual so the AI understands creator context regardless of language
    const tier =
      followers < 5_000
        ? language === "fr"
          ? "nano-influencer (< 5K abonnés) — collabs locales, échanges produits, micro-marques"
          : "nano-influencer (< 5K followers) — local collabs, product exchanges, micro-brands"
        : followers < 20_000
          ? language === "fr"
            ? "micro-influencer (5K–20K abonnés) — partenariats rémunérés régionaux, marques mid-range"
            : "micro-influencer (5K–20K followers) — paid regional partnerships, mid-range brands"
          : followers < 100_000
            ? language === "fr"
              ? "influencer (20K–100K abonnés) — partenariats rémunérés nationaux, marques connues"
              : "influencer (20K–100K followers) — paid national partnerships, well-known brands"
            : language === "fr"
              ? "macro-influencer (100K+ abonnés) — grands comptes, agences, contrats significatifs"
              : "macro-influencer (100K+ followers) — major accounts, agencies, significant contracts";

    // Detect whether hospitality / excursion interests are selected to unlock dedicated guidance
    const wantsHotel = interests.some((i) => /h[oô]tel|h[eé]berg|accommodation|lodging/i.test(i));
    const wantsExcursion = interests.some((i) =>
      /excursion|activit|tour|balade|randon|outdoor|adventure|loisir/i.test(i)
    );

    const hotelGuidance = wantsHotel
      ? language === "fr"
        ? `\n- Pour les hôtels : utilise le type "hotel". Inclus des hôtels boutique indépendants, des gîtes, des auberges de charme, des hôtels design. Le partenariat peut être : nuit offerte, week-end press, code promo exclusif pour l'audience. Ne suggère pas de grandes chaînes hôtelières internationales sauf si le tier le justifie.`
        : `\n- For hotels: use type "hotel". Include independent boutique hotels, B&Bs, charming inns, design hotels. Partnership can be: complimentary stay, press weekend, exclusive promo code for the audience. Avoid large international hotel chains unless the creator's tier justifies it.`
      : "";

    const excursionGuidance = wantsExcursion
      ? language === "fr"
        ? `\n- Pour les excursions : utilise le type "excursion". Inclus des compagnies d'activités à la journée : tours en bateau, randonnées guidées, escape games, ateliers culinaires, tours vélo, activités outdoor. Le partenariat peut être : activité offerte en échange de contenu, code promo, ambassadeur saisonnier.`
        : `\n- For excursions: use type "excursion". Include day-trip companies: boat tours, guided hikes, escape rooms, cooking workshops, bike tours, outdoor activities. Partnership can be: complimentary activity in exchange for content, promo code, seasonal brand ambassador.`
      : "";

    const isEn = language === "en";

    const prompt = isEn
      ? `You are a senior influence marketing and business development expert for content creators.

An Instagram creator is looking for concrete and realistic collaboration opportunities.

### Creator Profile
- Username: @${profile.username ?? "creator"}
- Followers: ${followers.toLocaleString("en-US")} → ${tier}
- Instagram bio: "${profile.bio ?? "N/A"}"
- Declared location: ${location}
- Interests / niche: ${interests.join(", ")}

### Your Mission
Identify exactly ${n} **realistic and profile-adapted** collaboration opportunities in or around "${location}". Do thorough, varied research — avoid obvious first ideas.

Key rules:
1. Calibrate suggestions to the creator's level — an unrealistic suggestion (e.g. Nike for a 1,200-follower account) is worthless.
2. Infer their main niche from bio and interests, then find partners in that niche.
3. Mix types: independent local brands, complementary creators in the same niche, local events, local media/blogs, independent shops, agencies, professional associations.
4. For brands, use realistic and verifiable names (existing brands, not fictional).
${excludeNames.length ? `5. **IMPORTANT** — Do NOT include any of these already-contacted or ignored entities: ${excludeNames.join(", ")}. Find entirely different names.` : ""}
6. potentialRevenue must match the creator's tier and local market.
7. reason must concretely explain why their audiences overlap.
8. instagramHandle should be real and verifiable Instagram handles when known.
9. contactEmail should be realistic probable emails (e.g. contact@brand.com, hello@brand.com).
10. **relevanceScore**: assign a score from 1 to 10 (10 = most relevant and realistic for THIS profile). Sort results from most (10) to least (1) relevant.
${hotelGuidance}${excursionGuidance}

Respond ONLY with this JSON (no markdown) — the collabs array must contain exactly ${n} items, sorted by relevanceScore descending:
{
  "summary": "2-sentence summary of identified opportunities, mention of creator tier",
  "collabs": [
    {
      "id": "1",
      "name": "Real brand/creator/event name",
      "type": "brand|creator|event|media|hotel|excursion",
      "niche": "specific shared niche",
      "location": "precise city/region",
      "reason": "Why this is relevant for THIS creator with THESE followers in THIS niche (2 sentences)",
      "instagramHandle": "@Instagram handle if known",
      "websiteHint": "probable domain name or search term",
      "potentialRevenue": "realistic range for the tier (e.g. product exchange, £50-150, £300-800)",
      "contactEmail": "contact email if known or probable pattern (e.g. contact@brand.com)",
      "relevanceScore": 9,
      "collabFormats": ["partenariat", "code_promo"]
    }
  ]
}

collabFormats must be a non-empty array chosen from: partenariat, nuitee_offerte, code_promo, sponsorise, ugc, ambassador. Pick 1–3 that best match this partner's type and niche.`
      : `Tu es un expert senior en marketing d'influence et développement commercial pour créateurs de contenu.

Un créateur Instagram cherche des opportunités de collaboration concrètes et réalistes.

### Profil détaillé du créateur
- Username: @${profile.username ?? "creator"}
- Abonnés: ${followers.toLocaleString("fr-FR")} → ${tier}
- Bio Instagram: "${profile.bio ?? "N/A"}"
- Localisation déclarée: ${location}
- Centres d'intérêt / niche: ${interests.join(", ")}

### Ta mission
Identifie exactement ${n} opportunités de collaboration **réalistes et adaptées à son profil** dans ou autour de "${location}". Tu dois faire une recherche approfondie et variée — pas les premières idées qui viennent.

Règles importantes :
1. Calibre les suggestions au niveau du créateur — une suggestion irréaliste (ex: Nike pour un profil à 1 200 abonnés) est inutile.
2. Déduis sa niche principale depuis sa bio et ses centres d'intérêt, puis cherche des partenaires dans cette niche.
3. Mélange les types : marques locales indépendantes, créateurs complémentaires dans la même niche, événements locaux, médias/blogs locaux, boutiques indépendantes, agences, associations professionnelles.
4. Pour les marques, donne des noms réalistes et vérifiables (marques existantes, pas fictives).
${excludeNames.length ? `5. **IMPORTANT** — N'inclus ABSOLUMENT PAS ces entités déjà contactées ou ignorées : ${excludeNames.join(", ")}. Cherche des noms entièrement différents.` : ""}
6. Le potentialRevenue doit être cohérent avec la taille du compte et le marché local.
7. La raison doit expliquer concrètement pourquoi leurs audiences se recoupent.
8. Les instagramHandle doivent être des handles Instagram réels et vérifiables quand tu les connais.
9. Les contactEmail doivent être des emails probables et réalistes (ex: contact@brand.com, hello@brand.fr).
10. **relevanceScore** : attribue un score de 1 à 10 (10 = opportunité la plus pertinente et réaliste pour CE profil). Trie les résultats du plus pertinent (10) au moins pertinent (1).
${hotelGuidance}${excursionGuidance}

Réponds UNIQUEMENT avec ce JSON (sans markdown) — le tableau collabs doit contenir exactement ${n} éléments, triés par relevanceScore décroissant :
{
  "summary": "Résumé en 2 phrases des opportunités identifiées, mention du tier du créateur",
  "collabs": [
    {
      "id": "1",
      "name": "Nom réel de la marque/créateur/événement",
      "type": "brand|creator|event|media|hotel|excursion",
      "niche": "niche spécifique en commun",
      "location": "ville/région précise",
      "reason": "Pourquoi c'est pertinent pour CE créateur avec CES abonnés dans CETTE niche (2 phrases)",
      "instagramHandle": "@handle Instagram si connu",
      "websiteHint": "nom de domaine probable ou terme de recherche",
      "potentialRevenue": "fourchette réaliste selon le tier (ex: échange produit, 50-150€, 300-800€)",
      "contactEmail": "email de contact si connu ou pattern probable (ex: contact@brand.com, partenariats@brand.fr)",
      "relevanceScore": 9,
      "collabFormats": ["partenariat", "code_promo"]
    }
  ]
}

collabFormats doit être un tableau non-vide choisi parmi : partenariat, nuitee_offerte, code_promo, sponsorise, ugc, ambassador. Sélectionne 1 à 3 formats adaptés au type et à la niche du partenaire.`;

    const raw = await generateText(prompt, { model: GEMINI_PRO });
    const rawClean = stripJsonFences(raw);
    const parsed = JSON.parse(rawClean) as { collabs: CollabMatch[]; summary: string };

    // Ensure sorted by relevanceScore descending (in case AI didn't)
    if (parsed.collabs) {
      parsed.collabs.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Error in /api/collabs:", error);
    return NextResponse.json({ success: false, error: "Failed to find collabs" }, { status: 500 });
  }
}
