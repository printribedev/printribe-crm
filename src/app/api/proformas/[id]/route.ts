import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proforma = await prisma.proforma.findUnique({ where: { id: Number(id) } });
  if (!proforma) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(proforma);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const proforma = await prisma.proforma.update({
    where: { id: Number(id) },
    data: { ref: body.ref, date: body.date, clientName: body.clientName, clientId: body.clientId ?? null, data: body.data },
  });
  return NextResponse.json(proforma);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.proforma.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
