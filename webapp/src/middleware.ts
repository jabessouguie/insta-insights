import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth middleware disabled — login feature hidden for this version.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: [] };
