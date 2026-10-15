import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getDownloadUrl, ASSETS_BUCKET } from "@/lib/r2";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id: Number(id) } });
  if (!asset?.storagePath) return NextResponse.json({ error: "No file" }, { status: 404 });

  const url = await getDownloadUrl(ASSETS_BUCKET, asset.storagePath);
  return NextResponse.json({ url });
}
