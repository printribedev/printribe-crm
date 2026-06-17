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

  const [orders, clients, monthlySales] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true, clientId: true, clientName: true, segment: true, stage: true, priority: true,
        saleValue: true, fabric: true, printing: true, transport: true,
        misc: true, jobWork: true, packaging: true, design: true, date: true,
      },
    }),
    prisma.client.findMany({
      select: { id: true, name: true, segment: true, totalValueOverride: true, ordersOverride: true },
      include: { orders: { select: { saleValue: true } } },
    }),
    prisma.monthlySales.findMany({ orderBy: [{ fyYear: "asc" }, { id: "asc" }] }),
  ]);

  // Compute client total values
  const clientStats = clients.map(c => ({
    id: c.id,
    name: c.name,
    segment: c.segment,
    totalValue: c.totalValueOverride
      ? Number(c.totalValueOverride)
      : c.orders.reduce((s, o) => s + Number(o.saleValue), 0),
  }));

  return NextResponse.json({
    orders: orders.map(o => ({
      ...o,
      saleValue: Number(o.saleValue),
      fabric: Number(o.fabric), printing: Number(o.printing),
      transport: Number(o.transport), misc: Number(o.misc),
      jobWork: Number(o.jobWork), packaging: Number(o.packaging),
      design: Number(o.design),
    })),
    clients: clientStats,
    monthlySales: monthlySales.map(m => ({
      id: m.id, month: m.month, sales: Number(m.sales),
      orderCount: m.orderCount, fyYear: m.fyYear,
    })),
  });
}
