import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences } from "@/lib/ai-provider";
import type { InstagramProfile } from "@/types/instagram";
import type { CollabMatch } from "@/app/api/collabs/route";

export const dynamic = "force-dynamic";

export interface CollabEmailRequest {
  collab: CollabMatch;
  profile: Partial<InstagramProfile>;
  language?: "fr" | "en";
}

export interface CollabEmailResponse {
  success: boolean;
  data?: { subject: string; body: string };
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<CollabEmailResponse>> {
  try {
    const body: CollabEmailRequest & { feedback?: string } = await request.json();
    const { collab, profile, language = "fr", feedback } = body;

    if (!isAIConfigured()) {
      return NextResponse.json(
        { success: false, error: "No AI provider configured" },
        { status: 501 }
      );
    }

    const isEn = language === "en";
    const followers = (profile.followerCount ?? 0).toLocaleString(isEn ? "en-US" : "fr-FR");

    // Tailor collaboration formats to the partner type (hotel / excursion get specific proposals)
    const collabFormats = isEn
      ? collab.type === "hotel"
        ? "- Suggest 2-3 concrete partnership forms: press stay / sponsored content, exclusive promo code for your audience, or seasonal ambassador role"
        : collab.type === "excursion"
          ? "- Suggest 2-3 concrete partnership forms: complimentary activity in exchange for content, exclusive discount code for your audience, or dedicated reel / carousel"
          : "- Suggest 2-3 concrete collaboration formats suited to their niche"
      : collab.type === "hotel"
        ? "- Proposer 2-3 formats de partenariat : séjour presse / contenu sponsorisé, code promo exclusif pour ton audience, ou rôle d'ambassadeur saisonnier"
        : collab.type === "excursion"
          ? "- Proposer 2-3 formats : activité offerte en échange de contenu, code de réduction exclusif pour ton audience, ou réel / carrousel dédié"
          : "- Proposer 2-3 formats de collaboration concrets adaptés à leur niche";

    const mediaKitLine = isEn
      ? `- End with: "Please find my media kit attached to this email."`
      : `- Mentionner "Vous trouverez mon media kit en pièce jointe de cet email" vers la fin`;

    const feedbackLine = feedback
      ? isEn
        ? `\n\nUser feedback on the previous version: ${feedback}`
        : `\n\nRetours utilisateur sur la version précédente : ${feedback}`
      : "";

    const prompt = isEn
      ? `You are an Instagram content creator @${profile.username ?? "creator"} with ${followers} followers.

You want to contact "${collab.name}" (${collab.type} · ${collab.niche}) for a collaboration.

Identified reason: ${collab.reason}

**IMPORTANT**: Act as if you just discovered this brand — never claim to have known them for a long time or to have an existing relationship. In your opening line, briefly explain how you found them (e.g. "While browsing Instagram, I came across your account…", "I was looking for brands in the ${collab.niche} space and found you…").

Write a professional yet authentic email IN ENGLISH to propose a collaboration.
The email must:
- Have a catchy subject line (< 60 chars)
- Open with a sincere hook explaining how you discovered them
- Briefly introduce yourself and your stats (${followers} followers, high engagement)
${collabFormats}
- Keep a professional but human tone, not generic
${mediaKitLine}
- Include a clear call-to-action
- Stay within 200-300 words

Respond ONLY with this JSON (no markdown, no surrounding quotes):
{
  "subject": "Email subject line",
  "body": "Full email body"
}${feedbackLine}`
      : `Tu es un créateur de contenu Instagram @${profile.username ?? "creator"} avec ${followers} abonnés.

Tu veux contacter "${collab.name}" (${collab.type} · ${collab.niche}) pour une collaboration.

Raison identifiée : ${collab.reason}

**IMPORTANT** : Considère que tu viens tout juste de découvrir cette entreprise/marque — n'affirme pas la connaître depuis longtemps ni avoir une relation existante. Dans l'accroche, explique brièvement comment tu l'as découverte (ex : "En parcourant Instagram, je suis tombé sur votre compte...", "En recherchant des marques dans le secteur ${collab.niche}...").

Rédige un email professionnel mais authentique EN FRANÇAIS pour proposer une collaboration.
L'email doit :
- Avoir un objet accrocheur (< 60 chars)
- Commencer par une accroche sincère expliquant comment tu as découvert leur marque
- Présenter brièvement le créateur et ses stats (${followers} abonnés, engagement élevé)
${collabFormats}
- Avoir un ton professionnel mais humain, pas générique
${mediaKitLine}
- Inclure un call-to-action clair
- Faire 200-300 mots max

Réponds UNIQUEMENT avec ce JSON (sans markdown ni guillemets autour) :
{
  "subject": "Objet de l'email",
  "body": "Corps complet de l'email"
}${feedbackLine}`;

    const rawText = await generateText(prompt);
    const raw = stripJsonFences(rawText);
    const parsed = JSON.parse(raw);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Error in /api/collabs/email:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate email" },
      { status: 500 }
    );
  }
}
