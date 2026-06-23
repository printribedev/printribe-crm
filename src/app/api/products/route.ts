import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkPerm } from "@/lib/permissions";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(products.map(p => ({
    ...p,
    variants: p.variants ? (() => { try { return JSON.parse(p.variants!); } catch { return []; } })() : [],
  })));
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "products", "create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
      description: body.description || null,
      variants: body.variants ? JSON.stringify(body.variants) : null,
      imagePath: body.imagePath || null,
      active: body.active !== false && body.active !== "false",
    },
  });
  return NextResponse.json(product, { status: 201 });
}
