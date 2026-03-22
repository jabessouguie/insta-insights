import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import type { CollabTracking } from "@/lib/collab-tracker-store";

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
    .from("user_collabs")
    .select("data")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, items: data.map((r) => r.data as CollabTracking) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const sb = getSupabase();
  if (!sb) return noSupabase();

  const body: CollabTracking = await req.json();
  if (!body?.collabId) return NextResponse.json({ error: "Missing collabId" }, { status: 400 });

  const { error } = await sb.from("user_collabs").upsert({
    id: body.collabId,
    user_id: session.user.id,
    data: body,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const sb = getSupabase();
  if (!sb) return noSupabase();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await sb
    .from("user_collabs")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
