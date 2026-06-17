import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Stage } from "@prisma/client";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

const STAGES: Stage[] = ["enquiry", "design", "sampling", "production", "qc", "dispatch", "delivered"];

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    orderBy: { date: "desc" },
    include: { notes: { orderBy: { ts: "asc" } }, timeline: { orderBy: { id: "asc" } } },
  });

  return NextResponse.json(orders.map(o => ({
    ...o,
    saleValue: Number(o.saleValue), gst: Number(o.gst),
    fabric: Number(o.fabric), printing: Number(o.printing),
    transport: Number(o.transport), misc: Number(o.misc),
    jobWork: Number(o.jobWork), packaging: Number(o.packaging),
    design: Number(o.design),
  })));
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const order = await prisma.order.create({
    data: {
      id: body.id,
      clientId: body.clientId ? Number(body.clientId) : null,
      clientName: body.clientName,
      product: body.product,
      segment: body.segment ?? "Corporate",
      date: new Date(body.date),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      qty: Number(body.qty),
      saleValue: Number(body.saleValue),
      gst: Number(body.gst),
      fabric: Number(body.fabric) || 0,
      printing: Number(body.printing) || 0,
      transport: Number(body.transport) || 0,
      misc: Number(body.misc) || 0,
      jobWork: Number(body.jobWork) || 0,
      packaging: Number(body.packaging) || 0,
      design: Number(body.design) || 0,
      stage: body.stage ?? "enquiry",
      priority: body.priority ?? "Normal",
      timeline: {
        create: STAGES.map(s => ({ stage: s, done: false, date: null })),
      },
    },
    include: { notes: true, timeline: true },
  });

  return NextResponse.json({ ...order, saleValue: Number(order.saleValue), gst: Number(order.gst) }, { status: 201 });
}
