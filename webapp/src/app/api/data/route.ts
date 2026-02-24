import { NextResponse } from "next/server";
import { parseInstagramExport } from "@/lib/instagram-parser";
import { mockAnalytics } from "@/lib/mock-data";
import type { DataApiResponse } from "@/types/instagram";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1 hour cache

export async function GET(): Promise<NextResponse<DataApiResponse>> {
  try {
    const data = await parseInstagramExport();

    if (data) {
      return NextResponse.json({ success: true, data });
    }

    // Fall back to mock data if no export found
    return NextResponse.json({
      success: true,
      data: mockAnalytics,
    });
  } catch (error) {
    console.error("Error in /api/data:", error);
    // Always return mock data as fallback
    return NextResponse.json({ success: true, data: mockAnalytics });
  }
}
