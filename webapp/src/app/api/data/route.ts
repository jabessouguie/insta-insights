import { NextResponse } from "next/server";
import { parseInstagramExport } from "@/lib/instagram-parser";
import { mockAnalytics } from "@/lib/mock-data";
import { InstagramGraphAPI } from "@/lib/instagram-graph-api";
import type { DataApiResponse } from "@/types/instagram";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse<DataApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    // ── Priority 1: Instagram Graph API (when token provided by client) ──────
    const token = request.headers.get("X-Instagram-Token");
    const accountId = request.headers.get("X-Instagram-Account-Id");

    if (token && accountId) {
      try {
        const api = new InstagramGraphAPI(token, accountId);
        const data = await api.buildAnalytics();
        return NextResponse.json({ success: true, data });
      } catch (apiErr) {
        console.error("Graph API error, falling back to export:", apiErr);
        // Fall through to export parsing
      }
    }

    // ── Priority 2: Local Instagram export ───────────────────────────────────
    const data = await parseInstagramExport(from, to);
    if (data) {
      return NextResponse.json({ success: true, data });
    }

    // ── Priority 3: Mock data ─────────────────────────────────────────────────
    return NextResponse.json({ success: true, data: mockAnalytics });
  } catch (error) {
    console.error("Error in /api/data:", error);
    return NextResponse.json({ success: true, data: mockAnalytics });
  }
}
