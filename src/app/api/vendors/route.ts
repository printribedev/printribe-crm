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

  const vendors = await prisma.vendor.findMany({ orderBy: { totalPurchased: "desc" } });
  return NextResponse.json(vendors);
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const vendor = await prisma.vendor.create({
    data: {
      name: body.name,
      gstin: body.gstin || null,
      type: body.type,
      city: body.city || null,
      contact: body.contact || null,
      phone: body.phone || null,
      gstRate: body.gstRate,
      totalPurchased: body.totalPurchased ?? 0,
      reliability: body.reliability ?? "Medium",
      category: body.category ?? "Raw_Material",
    },
  });
  return NextResponse.json(vendor, { status: 201 });
}
