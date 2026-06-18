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
      ribCost: Number(body.ribCost) || 0,
      fabricWeightPerPc: body.fabricWeightPerPc != null ? Number(body.fabricWeightPerPc) : null,
      fabricPricePerKg: body.fabricPricePerKg != null ? Number(body.fabricPricePerKg) : null,
      ribWeightPerPc: body.ribWeightPerPc != null ? Number(body.ribWeightPerPc) : null,
      ribPricePerKg: body.ribPricePerKg != null ? Number(body.ribPricePerKg) : null,
      stage: body.stage as Stage,
      priority: body.priority,
    },
    include: { notes: true, timeline: true },
  });

  const o = order as unknown as Record<string, unknown>;
  return NextResponse.json({
    ...o,
    saleValue: Number(o.saleValue), gst: Number(o.gst),
    fabric: Number(o.fabric), printing: Number(o.printing),
    transport: Number(o.transport), misc: Number(o.misc),
    jobWork: Number(o.jobWork), packaging: Number(o.packaging),
    design: Number(o.design), ribCost: Number(o.ribCost ?? 0),
    fabricWeightPerPc: o.fabricWeightPerPc != null ? Number(o.fabricWeightPerPc) : null,
    fabricPricePerKg: o.fabricPricePerKg != null ? Number(o.fabricPricePerKg) : null,
    ribWeightPerPc: o.ribWeightPerPc != null ? Number(o.ribWeightPerPc) : null,
    ribPricePerKg: o.ribPricePerKg != null ? Number(o.ribPricePerKg) : null,
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
