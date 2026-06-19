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

  // Parse product lines — new orders store JSON array, legacy orders store plain string
  let items: { product: string; hsn: string; qty: number; saleValue: number; gst: number }[];
  try {
    const parsed = JSON.parse(order.product);
    if (Array.isArray(parsed)) {
      items = parsed.map((line: { name: string; hsn: string; qty: number; unitPrice: number; gstPct: number }) => ({
        product: line.name,
        hsn: line.hsn || "6109",
        qty: line.qty,
        saleValue: line.qty * line.unitPrice,
        gst: line.qty * line.unitPrice * line.gstPct / 100,
      }));
    } else throw new Error("not array");
  } catch {
    // Legacy: single product string
    const product = await prisma.product.findFirst({
      where: { name: { contains: order.product.split(" ")[0], mode: "insensitive" } },
      select: { hsn: true },
    });
    items = [{
      product: order.product,
      hsn: product?.hsn ?? "6109",
      qty: order.qty,
      saleValue: Number(order.saleValue),
      gst: Number(order.gst),
    }];
  }

  return NextResponse.json({
    id: order.id,
    date: order.deliveryDate ?? order.date,
    items,
    totalSaleValue: Number(order.saleValue),
    totalGst: Number(order.gst),
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
