import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AssetType, ClientType, AssetFormat } from "@prisma/client";
import { checkPerm } from "@/lib/permissions";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "assets", "edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const asset = await prisma.asset.update({
    where: { id: Number(id) },
    data: {
      name: body.name,
      description: body.description ?? null,
      type: body.type as AssetType,
      clientType: body.clientType as ClientType,
      format: body.format as AssetFormat,
    },
  });
  return NextResponse.json(asset);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "assets", "delete")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id: Number(id) } });

  if (asset?.storagePath) {
    const supabase = await createClient();
    await supabase.storage.from("assets").remove([asset.storagePath]);
  }

  await prisma.asset.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
