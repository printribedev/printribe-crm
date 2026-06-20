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

  const [orders, clients, products] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true, clientId: true, clientName: true, product: true, segment: true, stage: true, priority: true,
        saleValue: true, gst: true, fabric: true, printing: true, transport: true,
        misc: true, jobWork: true, packaging: true, design: true, ribCost: true, date: true,
        dueDate: true, deliveryDate: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.client.findMany({
      select: {
        id: true, name: true, segment: true,
        totalValueOverride: true,
        orders: { select: { saleValue: true } },
      },
    }),
    prisma.product.findMany({ select: { name: true } }),
  ]);

  const clientStats = clients.map(c => ({
    id: c.id,
    name: c.name,
    segment: c.segment,
    totalValue: c.totalValueOverride
      ? Number(c.totalValueOverride)
      : c.orders.reduce((s, o) => s + Number(o.saleValue), 0),
  }));

  return NextResponse.json({
    productNames: products.map(p => p.name),
    orders: orders.map(o => ({
      ...o,
      saleValue: Number(o.saleValue),
      gst: Number(o.gst),
      fabric: Number(o.fabric), printing: Number(o.printing),
      transport: Number(o.transport), misc: Number(o.misc),
      jobWork: Number(o.jobWork), packaging: Number(o.packaging),
      design: Number(o.design), ribCost: Number(o.ribCost ?? 0),
    })),
    clients: clientStats,
  });
}
