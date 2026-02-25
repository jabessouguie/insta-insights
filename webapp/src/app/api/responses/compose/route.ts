import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export interface ComposeRequest {
  username: string;
  lastMessage: string;
  creatorProfile: { username?: string; followerCount?: number };
}

const encoder = new TextEncoder();

function textStream(text: string): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}

export async function POST(request: Request): Promise<Response> {
  const body: ComposeRequest & { feedback?: string } = await request.json();
  const { username, lastMessage, creatorProfile, feedback } = body;

  if (!username || !lastMessage) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing username or lastMessage" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback = `Salut @${username} ! Merci pour ton message 😊 Je reviens vers toi très vite !`;
    return textStream(fallback);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

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

Réponds UNIQUEMENT avec le texte de la réponse, sans guillemets ni explications.${feedback ? `\n\nRetours utilisateur sur la version précédente : ${feedback}` : ""}`;

  try {
    const stream = await model.generateContentStream(prompt);

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error in /api/responses/compose:", error);
    return new Response(JSON.stringify({ error: "Failed to compose reply" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
