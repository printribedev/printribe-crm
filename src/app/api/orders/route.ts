import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Stage } from "@prisma/client";
import { checkPerm } from "@/lib/permissions";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getShowFinancials(userId: string): Promise<boolean> {
  const perm = await prisma.userPermission.findUnique({ where: { userId } });
  return perm?.showFinancials ?? true;
}

const FINANCIAL_ZEROS = {
  saleValue: 0, gst: 0, fabric: 0, printing: 0, transport: 0,
  misc: 0, jobWork: 0, packaging: 0, design: 0, ribCost: 0,
  fabricWeightPerPc: null, fabricPricePerKg: null,
  ribWeightPerPc: null, ribPricePerKg: null,
};

function stripLineFinancials(product: string): string {
  try {
    const lines = JSON.parse(product);
    if (!Array.isArray(lines)) return product;
    return JSON.stringify(lines.map((l: Record<string, unknown>) => ({ ...l, unitPrice: 0 })));
  } catch { return product; }
}

function stripFinancials(o: Record<string, unknown>): Record<string, unknown> {
  return {
    ...o,
    ...FINANCIAL_ZEROS,
    product: typeof o.product === "string" ? stripLineFinancials(o.product) : o.product,
  };
}

const STAGES: Stage[] = ["design", "sampling", "production", "qc", "dispatch", "delivered", "delivered_pending"];

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

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const showFinancials = await getShowFinancials(user.id);
    const orders = await prisma.order.findMany({
      orderBy: { date: "desc" },
      include: { notes: { orderBy: { ts: "asc" } }, timeline: { orderBy: { id: "asc" } } },
    });
    return NextResponse.json(orders.map(o => {
      const serialized = serializeOrder(o as unknown as Record<string, unknown>);
      return showFinancials ? serialized : stripFinancials(serialized);
    }));
  } catch (e) {
    console.error("Orders GET error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "orders", "create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Auto-create client if a new name was typed with no existing clientId
  let clientId: number | null = body.clientId ? Number(body.clientId) : null;
  if (!clientId && body.clientName?.trim()) {
    const existing = await prisma.client.findFirst({
      where: { name: { equals: body.clientName.trim(), mode: "insensitive" } },
    });
    clientId = existing
      ? existing.id
      : (await prisma.client.create({
          data: { name: body.clientName.trim(), segment: body.segment ?? "Corporate" },
        })).id;
  }

  const order = await prisma.order.create({
    data: {
      id: body.id,
      clientId,
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
      ribCost: Number(body.ribCost) || 0,
      fabricWeightPerPc: body.fabricWeightPerPc != null ? Number(body.fabricWeightPerPc) : null,
      fabricPricePerKg: body.fabricPricePerKg != null ? Number(body.fabricPricePerKg) : null,
      ribWeightPerPc: body.ribWeightPerPc != null ? Number(body.ribWeightPerPc) : null,
      ribPricePerKg: body.ribPricePerKg != null ? Number(body.ribPricePerKg) : null,
      stage: body.stage ?? "design",
      priority: body.priority ?? "Normal",
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
      timeline: {
        create: STAGES.map(s => ({ stage: s, done: false, date: null })),
      },
    },
    include: { notes: true, timeline: true },
  });

  return NextResponse.json(serializeOrder(order as unknown as Record<string, unknown>), { status: 201 });
}
