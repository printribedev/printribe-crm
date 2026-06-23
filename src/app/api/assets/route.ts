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

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assets = await prisma.asset.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(assets);
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "assets", "create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const asset = await prisma.asset.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      type: body.type as AssetType,
      clientType: body.clientType as ClientType,
      format: body.format as AssetFormat,
      storagePath: body.storagePath ?? null,
    },
  });
  return NextResponse.json(asset, { status: 201 });
}
