import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export interface ComposeRequest {
  username: string;
  lastMessage: string;
  creatorProfile: { username?: string; followerCount?: number };
}

export interface ComposeResponse {
  success: boolean;
  data?: { suggestedReply: string };
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<ComposeResponse>> {
  try {
    const body: ComposeRequest = await request.json();
    const { username, lastMessage, creatorProfile } = body;

    if (!username || !lastMessage) {
      return NextResponse.json(
        { success: false, error: "Missing username or lastMessage" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback when no API key configured
      const fallback = `Salut @${username} ! Merci pour ton message 😊 Je reviens vers toi très vite !`;
      return NextResponse.json({ success: true, data: { suggestedReply: fallback } });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Tu es @${creatorProfile.username ?? "moi"}, créateur de contenu Instagram avec ${(creatorProfile.followerCount ?? 0).toLocaleString("fr-FR")} abonnés.

Tu dois répondre à ce message privé reçu de @${username} :

"""
${lastMessage}
"""

Rédige une réponse courte, authentique et chaleureuse en français (2-3 phrases max). La réponse doit :
- Être naturelle et personnelle, pas robotique
- Répondre directement au contenu du message
- Maintenir une relation positive
- Être appropriée pour un créateur de contenu

Réponds UNIQUEMENT avec le texte de la réponse, sans guillemets ni explications.`;

    const result = await model.generateContent(prompt);
    const suggestedReply = result.response.text().trim();

    return NextResponse.json({ success: true, data: { suggestedReply } });
  } catch (error) {
    console.error("Error in /api/responses/compose:", error);
    return NextResponse.json({ success: false, error: "Failed to compose reply" }, { status: 500 });
  }
}
