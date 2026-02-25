import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

interface GenerateRequest {
  caption: string;
  postUrl?: string;
  tone: "enthusiastic" | "casual" | "thoughtful" | "inspiring";
  language: "fr" | "en";
  userBio?: string;
  recentCaptions?: string[];
}

interface GenerateResponse {
  comments: string[];
  error?: string;
}

const TONE_LABELS = {
  enthusiastic: { fr: "enthousiaste et chaleureux", en: "enthusiastic and warm" },
  casual: { fr: "décontracté et naturel", en: "casual and natural" },
  thoughtful: { fr: "réfléchi et sincère", en: "thoughtful and sincere" },
  inspiring: { fr: "inspirant et motivant", en: "inspiring and uplifting" },
};

export async function POST(request: Request): Promise<NextResponse<GenerateResponse>> {
  const body = (await request.json()) as GenerateRequest;
  const { caption, postUrl, tone, language, userBio, recentCaptions } = body;

  if (!caption?.trim()) {
    return NextResponse.json({ comments: [], error: "Caption required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback without AI
    const fallback =
      language === "fr"
        ? ["Super post ! 🔥", "J'adore ce contenu !", "Incroyable, merci pour le partage 🙌"]
        : ["Amazing post! 🔥", "Love this content!", "Incredible, thanks for sharing 🙌"];
    return NextResponse.json({ comments: fallback });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

  const lang = language === "fr" ? "français" : "English";
  const toneLabel = TONE_LABELS[tone]?.[language] ?? TONE_LABELS.casual[language];

  const personalitySection =
    userBio || (recentCaptions?.length ?? 0) > 0
      ? `
Ma personnalité et style (pour t'inspirer) :
- Bio : ${userBio || "Non renseignée"}
- Mes publications récentes : ${(recentCaptions ?? [])
          .slice(0, 3)
          .map((c) => `"${c.substring(0, 80)}"`)
          .join(" | ")}
`
      : "";

  const prompt = `Tu es moi — un créateur de contenu Instagram. Tu dois laisser un commentaire sur un post.

${personalitySection}
Post à commenter :
${postUrl ? `- Lien : ${postUrl}` : ""}
- Caption : "${caption.substring(0, 500)}"

Génère exactement 3 commentaires en ${lang}, ton ${toneLabel}.
Contraintes :
- Maximum 2 phrases par commentaire
- Utilise des emojis naturellement (1-3 max)
- Varie les formulations (n'utilise pas les mêmes mots dans les 3)
- Parle en ton propre nom (pas "en tant que créateur...")
- Sois authentique, pas commercial

Réponds UNIQUEMENT avec un JSON valide :
{"comments": ["commentaire 1", "commentaire 2", "commentaire 3"]}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed.comments)) throw new Error("invalid");
    return NextResponse.json({ comments: parsed.comments.slice(0, 3) });
  } catch {
    return NextResponse.json(
      { comments: [], error: "Erreur lors de la génération. Réessaie." },
      { status: 500 }
    );
  }
}
