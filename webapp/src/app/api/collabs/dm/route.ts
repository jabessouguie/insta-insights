import { NextResponse } from "next/server";
import { generateText, isAIConfigured } from "@/lib/ai-provider";
import type { InstagramProfile } from "@/types/instagram";
import type { CollabMatch } from "@/app/api/collabs/route";

export const dynamic = "force-dynamic";

export interface CollabDMRequest {
  collab: CollabMatch;
  profile: Partial<InstagramProfile>;
  feedback?: string;
  language?: "fr" | "en";
  model?: string;
}

export interface CollabDMResponse {
  success: boolean;
  data?: { message: string };
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<CollabDMResponse>> {
  try {
    const body: CollabDMRequest = await request.json();
    const { collab, profile, feedback, language = "fr", model } = body;
    const lang = language === "fr" ? "français" : "English";

    if (!isAIConfigured()) {
      return NextResponse.json(
        { success: false, error: "No AI provider configured" },
        { status: 501 }
      );
    }

    const followers = (profile.followerCount ?? 0).toLocaleString("fr-FR");
    const handle = collab.instagramHandle ?? collab.name;

    const prompt = `Tu es le créateur Instagram @${profile.username ?? "creator"} (${followers} abonnés).

Tu veux envoyer un premier DM Instagram à ${handle} (${collab.type} dans la niche "${collab.niche}") pour proposer une collaboration.

Contexte de la collaboration : ${collab.reason}

Rédige un message Instagram direct (DM) en ${lang}.

Règles STRICTES :
- **Commence OBLIGATOIREMENT par "Bonjour @{handle}" (remplace {handle} par le handle réel)**
- Max 3 phrases courtes après la salutation — les DM trop longs ne sont pas lus
- Ton naturel, humain, pas corporatif — comme si tu parlais à quelqu'un que tu trouves cool
- Mentionne brièvement pourquoi tu penses qu'il y a une synergie (1 phrase)
- Termine avec une question ouverte ou une proposition légère (café virtuel, appel de 10 min, collab idée)
- Pas de "—", pas de bullet points, pas de formules toutes faites ("j'espère que ce message te trouve bien")
- Emojis autorisés (max 2), points autorisés
- Ne pas mentionner les stats du créateur (ça fait spam)
- Rédige uniquement le texte du message, rien d'autre
${feedback ? `\nRetours sur la version précédente : ${feedback}` : ""}`;

    const message = await generateText(prompt, { model });

    return NextResponse.json({ success: true, data: { message: message.trim() } });
  } catch (error) {
    console.error("Error in /api/collabs/dm:", error);
    return NextResponse.json({ success: false, error: "Failed to generate DM" }, { status: 500 });
  }
}
