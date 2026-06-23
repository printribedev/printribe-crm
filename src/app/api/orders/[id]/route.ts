import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Stage } from "@prisma/client";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function serializeOrder(o: Record<string, unknown>) {
  return {
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
  };
}

function stripLineFinancials(product: string): string {
  try {
    const lines = JSON.parse(product);
    if (!Array.isArray(lines)) return product;
    return JSON.stringify(lines.map((l: Record<string, unknown>) => ({ ...l, unitPrice: 0 })));
  } catch { return product; }
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
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
    },
    include: { notes: true, timeline: true },
  });

  const perm = await prisma.userPermission.findUnique({ where: { userId: user.id } });
  const showFinancials = perm?.showFinancials ?? true;
  const serialized = serializeOrder(order as unknown as Record<string, unknown>) as Record<string, unknown>;
  if (!showFinancials) {
    const stripped = {
      ...serialized,
      saleValue: 0, gst: 0, fabric: 0, printing: 0, transport: 0,
      misc: 0, jobWork: 0, packaging: 0, design: 0, ribCost: 0,
      fabricWeightPerPc: null, fabricPricePerKg: null,
      ribWeightPerPc: null, ribPricePerKg: null,
      product: typeof serialized.product === "string" ? stripLineFinancials(serialized.product) : serialized.product,
    };
    return NextResponse.json(stripped);
  }
  return NextResponse.json(serialized);
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
