import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Stage } from "@prisma/client";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const order = await prisma.order.update({
    where: { id },
    data: {
      clientId: body.clientId ? Number(body.clientId) : null,
      clientName: body.clientName,
      product: body.product,
      segment: body.segment,
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
      stage: body.stage as Stage,
      priority: body.priority,
    },
    include: { notes: true, timeline: true },
  });

  return NextResponse.json({
    ...order,
    saleValue: Number(order.saleValue), gst: Number(order.gst),
    fabric: Number(order.fabric), printing: Number(order.printing),
    transport: Number(order.transport), misc: Number(order.misc),
    jobWork: Number(order.jobWork), packaging: Number(order.packaging),
    design: Number(order.design),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.orderNote.deleteMany({ where: { orderId: id } });
  await prisma.orderTimeline.deleteMany({ where: { orderId: id } });
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
