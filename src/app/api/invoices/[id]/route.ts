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

  const order = await prisma.order.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Look up HSN from products table by matching product name
  const product = await prisma.product.findFirst({
    where: { name: { contains: order.product.split(" ")[0], mode: "insensitive" } },
    select: { hsn: true, gstRate: true },
  });

  return NextResponse.json({
    id: order.id,
    date: order.date,
    qty: order.qty,
    product: order.product,
    hsn: product?.hsn ?? "6109",
    saleValue: Number(order.saleValue),
    gst: Number(order.gst),
    client: order.client ? {
      name: order.client.name,
      gstin: order.client.gstin,
      address: order.client.address,
      city: order.client.city,
      email: order.client.email,
      phone: order.client.phone,
    } : {
      name: order.clientName,
      gstin: null, address: null, city: null, email: null, phone: null,
    },
  });
}
