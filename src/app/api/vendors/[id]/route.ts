import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const vendor = await prisma.vendor.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      gstin: body.gstin || null,
      type: body.type,
      city: body.city || null,
      contact: body.contact || null,
      phone: body.phone || null,
      gstRate: body.gstRate,
      totalPurchased: body.totalPurchased ?? 0,
      reliability: body.reliability,
      category: body.category,
    },
  });
  return NextResponse.json(vendor);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.vendor.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
