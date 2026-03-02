import { NextResponse } from "next/server";
import { InstagramGraphAPI } from "@/lib/instagram-graph-api";

export const dynamic = "force-dynamic";

interface ValidateRequest {
  token: string;
  accountId: string;
}

interface ValidateResponse {
  success: boolean;
  username?: string;
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<ValidateResponse>> {
  try {
    const body: ValidateRequest = await request.json();
    const { token, accountId } = body;

    if (!token?.trim() || !accountId?.trim()) {
      return NextResponse.json(
        { success: false, error: "Token and Account ID are required" },
        { status: 400 }
      );
    }

    const api = new InstagramGraphAPI(token.trim(), accountId.trim());
    const username = await api.validateToken();

    return NextResponse.json({ success: true, username });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ success: false, error: msg }, { status: 401 });
  }
}
