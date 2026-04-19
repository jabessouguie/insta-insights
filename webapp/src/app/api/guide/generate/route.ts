import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences, GEMINI_FLASH } from "@/lib/ai-provider";
import { generateGuideHTML } from "@/lib/guide-generator";
import type { GuideConfig, GuideSection, GuideType } from "@/types/instagram";

export const dynamic = "force-dynamic";

export interface GuideGenerateRequest {
  /** Raw user input: one text block per section (array of plain text) */
  rawSections: string[];
  /** Base64 data URLs for uploaded photos */
  photos?: string[];
  type: GuideType;
  title: string;
  subtitle?: string;
  authorName?: string;
  accentColor?: string;
  language?: "fr" | "en";
  model?: string;
}

export interface GuideGenerateResponse {
  success: boolean;
  html?: string;
  error?: string;
}

const TYPE_PROMPTS: Record<GuideType, { fr: string; en: string }> = {
  travel: {
    fr: "guide de voyage pratique et inspirant",
    en: "practical and inspiring travel guide",
  },
  tutorial: { fr: "tutoriel pas-à-pas clair et pédagogique", en: "clear, step-by-step tutorial" },
  recipe: {
    fr: "recette détaillée avec conseils de chef",
    en: "detailed recipe with chef tips",
  },
  tips: {
    fr: "liste de conseils actionnables et percutants",
    en: "actionable and impactful tips",
  },
  general: { fr: "guide complet et bien structuré", en: "comprehensive, well-structured guide" },
};

export async function POST(request: Request): Promise<NextResponse<GuideGenerateResponse>> {
  try {
    const body: GuideGenerateRequest = await request.json();
    const {
      rawSections,
      photos = [],
      type,
      title,
      subtitle,
      authorName,
      accentColor,
      language = "fr",
    } = body;

    if (!title.trim() || rawSections.length === 0) {
      return NextResponse.json(
        { success: false, error: "title and at least one section are required" },
        { status: 400 }
      );
    }

    const isEn = language === "en";
    const typePhraseObj = TYPE_PROMPTS[type] ?? TYPE_PROMPTS.general;
    const typePhrase = isEn ? typePhraseObj.en : typePhraseObj.fr;
    const numPhotos = photos.length;

    const sectionsInput = rawSections.map((s, i) => `Section ${i + 1}:\n${s.trim()}`).join("\n\n");

    const photoInstruction =
      numPhotos > 0
        ? isEn
          ? `\n\nThe creator has uploaded ${numPhotos} photo(s) (indexed 0 to ${numPhotos - 1}). For each section assign photoIndex: the photo index that best matches the section topic (-1 if no photo is appropriate). Distribute photos across sections — don't assign the same index to all.`
          : `\n\nLe créateur a importé ${numPhotos} photo(s) (indexées 0 à ${numPhotos - 1}). Pour chaque section, attribue photoIndex: l'index de la photo qui correspond le mieux au contenu de la section (-1 si aucune photo ne convient). Distribue les photos entre les sections — n'attribue pas le même index partout.`
        : "";

    if (!isAIConfigured()) {
      // Fallback: use raw sections as-is without AI enrichment
      const sections: GuideSection[] = rawSections.map((raw, i) => ({
        title: isEn ? `Step ${i + 1}` : `Étape ${i + 1}`,
        content: raw.trim(),
        photoIndex: numPhotos > 0 ? i % numPhotos : -1,
      }));
      const html = generateGuideHTML({
        title,
        subtitle,
        type,
        authorName,
        accentColor,
        sections,
        photos,
      });
      return NextResponse.json({ success: true, html });
    }

    const prompt = isEn
      ? `You are a professional content editor specialising in ${typePhrase}.

The creator wants to generate a guide titled: "${title}"${subtitle ? ` (subtitle: "${subtitle}")` : ""}.

Here is the raw content provided, split into sections:
${sectionsInput}

Your task: Transform each raw section into polished, engaging content.
For each section:
- Write a short, punchy section title (4-8 words)
- Expand and polish the content into 2-4 well-written sentences (keep the author's voice, add practical value)
- Preserve any numbers, dates, or specific details the author mentioned${photoInstruction}

Respond ONLY with this JSON (no markdown):
{
  "sections": [
    {
      "title": "Section title",
      "content": "Polished section content",
      "photoIndex": -1
    }
  ]
}`
      : `Tu es un éditeur de contenu professionnel spécialisé dans la création de ${typePhrase}.

Le créateur veut générer un guide intitulé : "${title}"${subtitle ? ` (sous-titre : "${subtitle}")` : ""}.

Voici le contenu brut fourni, divisé en sections :
${sectionsInput}

Ta mission : Transformer chaque section brute en contenu soigné et engageant.
Pour chaque section :
- Rédige un titre de section court et percutant (4-8 mots)
- Développe et polish le contenu en 2-4 phrases bien rédigées (garde la voix de l'auteur, apporte de la valeur pratique)
- Conserve les chiffres, dates ou détails spécifiques mentionnés par l'auteur${photoInstruction}

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{
  "sections": [
    {
      "title": "Titre de la section",
      "content": "Contenu poli de la section",
      "photoIndex": -1
    }
  ]
}`;

    const rawText = await generateText(prompt, { model: body.model ?? GEMINI_FLASH });
    const parsed = JSON.parse(stripJsonFences(rawText)) as { sections: GuideSection[] };

    const config: GuideConfig = {
      title,
      subtitle,
      type,
      authorName,
      accentColor,
      sections: parsed.sections,
      photos,
    };

    const html = generateGuideHTML(config);
    return NextResponse.json({ success: true, html });
  } catch (error) {
    console.error("Error in /api/guide/generate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate guide" },
      { status: 500 }
    );
  }
}
