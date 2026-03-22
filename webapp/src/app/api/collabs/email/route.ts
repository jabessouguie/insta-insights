import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences } from "@/lib/ai-provider";
import type { InstagramProfile } from "@/types/instagram";
import type { CollabMatch } from "@/app/api/collabs/route";

export const dynamic = "force-dynamic";

export interface CollabEmailRequest {
  collab: CollabMatch;
  profile: Partial<InstagramProfile>;
  language?: "fr" | "en";
  /** When true, generates a follow-up reminder email referencing the initial contact */
  followUp?: boolean;
  /** Creator first name from Identity settings — used to sign the email */
  creatorFirstName?: string;
  /** Past collaborations formatted as text — injected into the prompt for social proof */
  pastCollabsContext?: string;
}

export interface CollabEmailResponse {
  success: boolean;
  data?: { subject: string; body: string };
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<CollabEmailResponse>> {
  try {
    const body: CollabEmailRequest & { feedback?: string } = await request.json();
    const {
      collab,
      profile,
      language = "fr",
      feedback,
      followUp = false,
      creatorFirstName,
      pastCollabsContext,
    } = body;

    if (!isAIConfigured()) {
      return NextResponse.json(
        { success: false, error: "No AI provider configured" },
        { status: 501 }
      );
    }

    const isEn = language === "en";
    const followers = (profile.followerCount ?? 0).toLocaleString(isEn ? "en-US" : "fr-FR");
    // Signature line — use first name if provided, otherwise fall back to @username
    const sigName = creatorFirstName?.trim() || `@${profile.username ?? "creator"}`;
    const signatureLine = isEn
      ? `- Sign the email with the name: ${sigName}`
      : `- Signe l'email avec le prénom : ${sigName}`;

    // Past collaborations block for social proof
    const pastCollabsBlock = pastCollabsContext
      ? isEn
        ? `\n\nCreator's past collaborations (use as social proof in the email, naturally):\n${pastCollabsContext}`
        : `\n\nCollaborations passées du créateur (à utiliser comme preuve sociale dans l'email, de façon naturelle) :\n${pastCollabsContext}`
      : "";

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

Identified reason: ${collab.reason}${pastCollabsBlock}

**IMPORTANT**: Act as if you just discovered this brand — never claim to have known them for a long time or to have an existing relationship. In your opening line, briefly explain how you found them (e.g. "While browsing Instagram, I came across your account…", "I was looking for brands in the ${collab.niche} space and found you…").

Write a professional yet authentic email IN ENGLISH to propose a collaboration.
The email must:
- Have a catchy subject line (< 60 chars)
- Open with a sincere hook explaining how you discovered them
- Briefly introduce yourself and your stats (${followers} followers, high engagement)
${collabFormats}
- Keep a professional but human tone, not generic
${mediaKitLine}
${signatureLine}
- Include a clear call-to-action
- Stay within 200-300 words

Respond ONLY with this JSON (no markdown, no surrounding quotes):
{
  "subject": "Email subject line",
  "body": "Full email body"
}${feedbackLine}`
      : `Tu es un créateur de contenu Instagram @${profile.username ?? "creator"} avec ${followers} abonnés.

Tu veux contacter "${collab.name}" (${collab.type} · ${collab.niche}) pour une collaboration.

Raison identifiée : ${collab.reason}${pastCollabsBlock}

**IMPORTANT** : Considère que tu viens tout juste de découvrir cette entreprise/marque — n'affirme pas la connaître depuis longtemps ni avoir une relation existante. Dans l'accroche, explique brièvement comment tu l'as découverte (ex : "En parcourant Instagram, je suis tombé sur votre compte...", "En recherchant des marques dans le secteur ${collab.niche}...").

Rédige un email professionnel mais authentique EN FRANÇAIS pour proposer une collaboration.
L'email doit :
- Avoir un objet accrocheur (< 60 chars)
- Commencer par une accroche sincère expliquant comment tu as découvert leur marque
- Présenter brièvement le créateur et ses stats (${followers} abonnés, engagement élevé)
${collabFormats}
- Avoir un ton professionnel mais humain, pas générique
${mediaKitLine}
${signatureLine}
- Inclure un call-to-action clair
- Faire 200-300 mots max

Réponds UNIQUEMENT avec ce JSON (sans markdown ni guillemets autour) :
{
  "subject": "Objet de l'email",
  "body": "Corps complet de l'email"
}${feedbackLine}`;

    // Override with a follow-up prompt when requested
    const finalPrompt = followUp
      ? isEn
        ? `You are an Instagram content creator @${profile.username ?? "creator"} with ${followers} followers.

You previously sent a collaboration pitch to "${collab.name}" (${collab.type} · ${collab.niche}) but have not received a reply yet.

Write a short, polite follow-up email IN ENGLISH to gently remind them of your initial message.
The email must:
- Have a concise subject line (< 60 chars) referencing the follow-up
- Open by referencing your previous message briefly (1 sentence)
- Reiterate your interest and the potential value in 1-2 sentences
- Keep a friendly, non-pushy tone
${signatureLine}
- End with a clear question or call-to-action
- Stay within 100-150 words (follow-ups must be short)

Respond ONLY with this JSON (no markdown):
{
  "subject": "Follow-up subject line",
  "body": "Full follow-up email body"
}${feedbackLine}`
        : `Tu es un créateur de contenu Instagram @${profile.username ?? "creator"} avec ${followers} abonnés.

Tu as envoyé une proposition de collaboration à "${collab.name}" (${collab.type} · ${collab.niche}) mais n'as pas encore reçu de réponse.

Rédige un court email de relance EN FRANÇAIS pour rappeler poliment ton message précédent.
L'email doit :
- Avoir un objet court (< 60 chars) faisant référence à la relance
- Ouvrir en faisant brièvement référence à ton message précédent (1 phrase)
- Réitérer ton intérêt et la valeur potentielle en 1-2 phrases
- Garder un ton amical, sans pression
${signatureLine}
- Terminer par une question claire ou un call-to-action
- Faire 100-150 mots max (une relance doit être courte)

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{
  "subject": "Objet de la relance",
  "body": "Corps complet de l'email de relance"
}${feedbackLine}`
      : prompt;

    const rawText = await generateText(finalPrompt);
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
