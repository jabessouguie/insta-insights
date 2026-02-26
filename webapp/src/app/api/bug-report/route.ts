import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

interface BugReportRequest {
  screenshot?: string; // base64 PNG
  video?: string; // base64 webm
  description?: string;
  pageUrl?: string;
  userAgent?: string;
}

interface BugReportResponse {
  success: boolean;
  issueUrl?: string;
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<BugReportResponse>> {
  try {
    const body: BugReportRequest = await request.json();
    const { screenshot, video, description, pageUrl, userAgent } = body;

    if (!screenshot && !video && !description?.trim()) {
      return NextResponse.json(
        { success: false, error: "Fournissez une capture d'écran, une vidéo ou une description" },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO; // "owner/repo"

    // ── Step 1: Analyse with Gemini ───────────────────────────────────────────
    let issueTitle = "Bug signalé par un utilisateur";
    let issueBody = "";

    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const contextText = [
        pageUrl ? `Page : ${pageUrl}` : "",
        userAgent ? `Navigateur : ${userAgent}` : "",
        description ? `Description utilisateur : ${description}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const parts: Parameters<typeof model.generateContent>[0] = [];

      if (screenshot) {
        parts.push({
          inlineData: { mimeType: "image/png", data: screenshot },
        });
      }

      parts.push(`Tu es un assistant de triage de bugs pour une application web d'analyse Instagram.

Analyse ${screenshot ? "cette capture d'écran" : "la description ci-dessous"} et identifie le problème.

Contexte :
${contextText}

Génère un titre d'issue court (max 80 caractères) et une description markdown détaillée avec :
- Ce qui est visible / décrit comme problème
- La page / fonctionnalité affectée
- Les étapes possibles pour reproduire (si identifiables)
- Le niveau de sévérité estimé (low / medium / high / critical)

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{
  "title": "Titre court de l'issue",
  "body": "Description markdown complète",
  "severity": "low|medium|high|critical"
}
`);

      const result = await model.generateContent(parts);
      const raw = result.response
        .text()
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      try {
        const parsed = JSON.parse(raw) as {
          title: string;
          body: string;
          severity: string;
        };
        issueTitle = parsed.title ?? issueTitle;
        issueBody = `${parsed.body ?? ""}\n\n---\n**Sévérité estimée :** ${parsed.severity ?? "?"}\n**Page :** ${pageUrl ?? "N/A"}\n**Navigateur :** ${userAgent ?? "N/A"}`;
      } catch {
        issueBody = description ?? "Pas de description fournie.";
      }
    } else {
      // No Gemini key — use raw description
      issueTitle = description?.substring(0, 80) ?? "Bug signalé";
      issueBody = `**Description :** ${description ?? "—"}\n\n**Page :** ${pageUrl ?? "N/A"}\n**Navigateur :** ${userAgent ?? "N/A"}`;
    }

    // ── Step 2: Handle Attachments via GitHub Contents API ────────────────────
    let attachmentsMarkdown = "";

    if (githubToken && githubRepo) {
      const timestamp = Date.now();
      const upload = async (name: string, content: string) => {
        const path = `bug-reports/${timestamp}-${name}`;
        const res = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${path}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Upload bug report attachment: ${name}`,
            content: content,
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { content: { download_url: string } };
          return json.content.download_url;
        }
        return null;
      };

      if (screenshot) {
        const url = await upload("screenshot.png", screenshot);
        if (url) attachmentsMarkdown += `\n\n### Capture d'écran\n![Screenshot](${url})`;
      }

      if (video) {
        const url = await upload("video.webm", video);
        if (url)
          attachmentsMarkdown += `\n\n### Vidéo du bug\n[Télécharger / Voir la vidéo](${url})`;
      }
    }

    if (attachmentsMarkdown) {
      issueBody += attachmentsMarkdown;
    }

    // ── Step 3: Create GitHub issue ───────────────────────────────────────────
    if (!githubToken || !githubRepo) {
      return NextResponse.json({
        success: true,
        issueUrl: undefined,
        description: issueBody, // Return draft if no token
      });
    }

    const githubRes = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ["bug"],
      }),
    });

    if (!githubRes.ok) {
      const errText = await githubRes.text();
      console.error("GitHub issue creation failed:", errText);
      return NextResponse.json(
        { success: false, error: "Impossible de créer l'issue GitHub" },
        { status: 502 }
      );
    }

    const issue = (await githubRes.json()) as { html_url: string };
    return NextResponse.json({ success: true, issueUrl: issue.html_url });
  } catch (error) {
    console.error("Error in /api/bug-report:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la création du rapport" },
      { status: 500 }
    );
  }
}
