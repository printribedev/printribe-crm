import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Stage } from "@prisma/client";

const STAGES: Stage[] = ["design", "sampling", "production", "qc", "dispatch", "delivered", "delivered_pending"];

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function nextOrderId(allIds: string[]): string {
  const now = new Date();
  const fy = now.getMonth() >= 3
    ? `${String(now.getFullYear()).slice(2)}-${String(now.getFullYear() + 1).slice(2)}`
    : `${String(now.getFullYear() - 1).slice(2)}-${String(now.getFullYear()).slice(2)}`;
  const maxSerial = allIds.reduce((max, id) => {
    const serial = parseInt(id.split("/")?.[2] ?? "0") || 0;
    return Math.max(max, serial);
  }, 0);
  return `PT/PI/${String(maxSerial + 1).padStart(3, "0")}/${fy}`;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const proformaId = parseInt(id);

    const proforma = await prisma.proforma.findUnique({ where: { id: proformaId } });
    if (!proforma) return NextResponse.json({ error: "Proforma not found" }, { status: 404 });
    if (proforma.orderId) return NextResponse.json({ error: "Already converted", orderId: proforma.orderId }, { status: 409 });

    const allOrders = await prisma.order.findMany({ select: { id: true } });
    const orderId = nextOrderId(allOrders.map(o => o.id));

    const data = proforma.data as {
      items: { product: string; hsn: string; qty: number; unitPrice: number; gstPct: number }[];
      totalSaleValue: number;
      totalGst: number;
      client: { name: string };
    };

    const client = proforma.clientId
      ? await prisma.client.findUnique({ where: { id: proforma.clientId } })
      : null;

    const totalQty = data.items.reduce((sum, i) => sum + i.qty, 0);
    const productJson = JSON.stringify(
      data.items.map(i => ({
        productId: null,
        name: i.product,
        hsn: i.hsn,
        qty: i.qty,
        unitPrice: i.unitPrice,
        gstPct: i.gstPct,
        fabric: 0, printing: 0, transport: 0, misc: 0,
        jobWork: 0, packaging: 0, design: 0, ribCost: 0,
      }))
    );

    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          id: orderId,
          clientId: proforma.clientId ?? null,
          clientName: proforma.clientName,
          product: productJson,
          segment: client?.segment ?? "Corporate",
          date: new Date(proforma.date),
          qty: totalQty,
          saleValue: data.totalSaleValue,
          gst: data.totalGst,
          stage: "design",
          priority: "Normal",
          timeline: { create: STAGES.map(s => ({ stage: s, done: false, date: null })) },
        },
      }),
      prisma.proforma.update({
        where: { id: proformaId },
        data: { orderId },
      }),
    ]);

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (e) {
    console.error("[convert] error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
