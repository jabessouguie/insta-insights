import { NextResponse } from "next/server";
import { analyseInteractions, analyseInteractionsFromAPI } from "@/lib/interaction-analyser";
import type { InteractionApiResponse } from "@/types/instagram";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse<InteractionApiResponse>> {
  try {
    // ── Priority 1: Graph API (when token provided) ────────────────────────
    const token = request.headers.get("X-Instagram-Token");
    const accountId = request.headers.get("X-Instagram-Account-Id");

    if (token && accountId) {
      try {
        const data = await analyseInteractionsFromAPI(token, accountId);
        return NextResponse.json({ success: true, data });
      } catch (apiErr) {
        console.error("Graph API interactions error, falling back to export:", apiErr);
        // Fall through to export
      }
    }

    // ── Priority 2: Local Instagram export ────────────────────────────────
    const data = await analyseInteractions();
    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "No Instagram export data found. Please add your export to data/.",
        },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in /api/interactions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyse interactions." },
      { status: 500 }
    );
  }
}
