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

  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const product = await prisma.product.create({
    data: {
      name: body.name,
      hsn: body.hsn,
      gstRate: body.gstRate,
      category: body.category ?? "Apparel",
      moq: Number(body.moq) || 20,
      basePrice: Number(body.basePrice) || 0,
      gsm: body.gsm || null,
      decoration: body.decoration || null,
      active: body.active !== false && body.active !== "false",
    },
  });
  return NextResponse.json(product, { status: 201 });
}
