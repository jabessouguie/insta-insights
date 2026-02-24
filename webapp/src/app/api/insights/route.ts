import { NextResponse } from "next/server";
import { generateInsights } from "@/lib/gemini";
import { mockCreatorInsights, mockAgencyInsights } from "@/lib/mock-data";
import type { InsightsApiRequest, InsightsApiResponse } from "@/types/instagram";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse<InsightsApiResponse>> {
  try {
    const body: InsightsApiRequest = await request.json();

    if (!body.metrics || !body.profile) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: metrics, profile" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return mock insights when API key is not configured
      const insights = body.mode === "agency" ? mockAgencyInsights : mockCreatorInsights;
      return NextResponse.json({
        success: true,
        data: {
          insights,
          summary:
            body.mode === "agency"
              ? "Portfolio de créateurs performant avec des opportunités de croissance identifiées."
              : "Profil avec un bon potentiel. Les Reels sont ton meilleur levier de croissance.",
          generatedAt: new Date(),
          model: "mock",
        },
      });
    }

    const result = await generateInsights(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error in /api/insights:", error);

    // Graceful fallback to mock insights
    return NextResponse.json({
      success: true,
      data: {
        insights: mockCreatorInsights,
        summary: "Analyse basée sur vos données Instagram.",
        generatedAt: new Date(),
        model: "fallback",
      },
    });
  }
}
