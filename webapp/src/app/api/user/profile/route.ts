import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import type { UserProfile } from "@/lib/user-profile-store";

export const dynamic = "force-dynamic";

function noSupabase() {
  return NextResponse.json({ error: "Storage not configured" }, { status: 501 });
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const sb = getSupabase();
  if (!sb) return noSupabase();

  const { data, error } = await sb
    .from("user_profiles")
    .select("data")
    .eq("user_id", session.user.id)
    .single();

  if (error?.code === "PGRST116") {
    // No row yet — return empty profile
    return NextResponse.json({ success: true, profile: null });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, profile: data?.data as UserProfile | null });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const sb = getSupabase();
  if (!sb) return noSupabase();

  const body: UserProfile = await req.json();

  const { error } = await sb.from("user_profiles").upsert({
    user_id: session.user.id,
    data: body,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
