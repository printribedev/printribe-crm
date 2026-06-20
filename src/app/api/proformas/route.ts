import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proformas = await prisma.proforma.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(proformas);
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const proforma = await prisma.proforma.create({
    data: {
      ref: body.ref,
      date: body.date,
      clientId: body.clientId ?? null,
      clientName: body.clientName,
      data: body.data,
    },
  });
  return NextResponse.json(proforma, { status: 201 });
}
