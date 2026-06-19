import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  if (!path) return NextResponse.json({ error: "No path" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("assets").createSignedUrl(path, 300);
  if (error || !data) return NextResponse.json({ error: "Could not generate URL" }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
