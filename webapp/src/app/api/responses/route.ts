import { NextResponse } from "next/server";
import { listUnansweredDMs } from "@/lib/dm-response-composer";
import type { UnansweredDM } from "@/lib/dm-response-composer";

export const dynamic = "force-dynamic";

export interface ResponsesApiResponse {
  success: boolean;
  data?: UnansweredDM[];
  error?: string;
}

export async function GET(): Promise<NextResponse<ResponsesApiResponse>> {
  try {
    const dms = listUnansweredDMs();
    return NextResponse.json({ success: true, data: dms });
  } catch (error) {
    console.error("Error in /api/responses:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list unanswered DMs" },
      { status: 500 }
    );
  }
}
