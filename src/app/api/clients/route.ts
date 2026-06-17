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

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { orders: true } },
      orders: { select: { saleValue: true } },
    },
  });

  const result = clients.map(c => {
    const computedOrderCount = c._count.orders;
    const computedTotalValue = c.orders.reduce((s, o) => s + Number(o.saleValue), 0);
    return {
      id: c.id,
      name: c.name,
      gstin: c.gstin,
      type: c.type,
      city: c.city,
      address: c.address,
      contact: c.contact,
      phone: c.phone,
      email: c.email,
      segment: c.segment,
      lastOrder: c.lastOrder,
      createdAt: c.createdAt,
      orderCount: c.ordersOverride ?? computedOrderCount,
      totalValue: c.totalValueOverride !== null && c.totalValueOverride !== undefined
        ? Number(c.totalValueOverride)
        : computedTotalValue,
      totalValueOverride: c.totalValueOverride !== null ? Number(c.totalValueOverride) : null,
      ordersOverride: c.ordersOverride,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const client = await prisma.client.create({
    data: {
      name: body.name,
      gstin: body.gstin || null,
      type: body.type || null,
      city: body.city || null,
      address: body.address || null,
      contact: body.contact || null,
      phone: body.phone || null,
      email: body.email || null,
      segment: body.segment ?? "Corporate",
      lastOrder: body.lastOrder || null,
      totalValueOverride: body.totalValueOverride ?? null,
      ordersOverride: body.ordersOverride ?? null,
    },
  });
  return NextResponse.json(client, { status: 201 });
}
