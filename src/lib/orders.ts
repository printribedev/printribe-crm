import { prisma } from "@/lib/prisma";
import { Stage, Segment, Priority } from "@prisma/client";

const STAGES: Stage[] = ["design", "sampling", "production", "qc", "dispatch", "delivered", "delivered_pending"];

async function genOrderId(): Promise<string> {
  const now = new Date();
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyShort = `${String(fy).slice(2)}-${String(fy + 1).slice(2)}`;

  // Find highest serial across all orders matching PT/PI/XXX/{fyShort}
  const orders = await prisma.order.findMany({
    where: { id: { contains: `/${fyShort}` } },
    select: { id: true },
  });
  const maxSerial = orders.reduce((max, o) => {
    const serial = parseInt(o.id?.split("/")?.[2] ?? "0") || 0;
    return serial > max ? serial : max;
  }, 0);

  return `PT/PI/${String(maxSerial + 1).padStart(3, "0")}/${fyShort}`;
}

export async function createOrder(data: {
  clientName: string; product: string; qty: number; saleValue: number; gst: number;
  fabric?: number; printing?: number; transport?: number; misc?: number;
  jobWork?: number; packaging?: number; design?: number; ribCost?: number;
  segment?: string; priority?: string; date?: string; dueDate?: string;
  id?: string;
}) {
  // Resolve or create client
  let clientId: number | null = null;
  if (data.clientName?.trim()) {
    const existing = await prisma.client.findFirst({
      where: { name: { equals: data.clientName.trim(), mode: "insensitive" } },
    });
    clientId = existing
      ? existing.id
      : (await prisma.client.create({
          data: { name: data.clientName.trim(), segment: (data.segment as Segment) ?? "Corporate" },
        })).id;
  }

  const order = await prisma.order.create({
    data: {
      id: data.id ?? await genOrderId(),
      clientId,
      clientName: data.clientName,
      product: data.product,
      segment: (data.segment as Segment) ?? "Corporate",
      date: data.date ? new Date(data.date) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      qty: Number(data.qty),
      saleValue: Number(data.saleValue),
      gst: Number(data.gst),
      fabric:    Number(data.fabric)    || 0,
      printing:  Number(data.printing)  || 0,
      transport: Number(data.transport) || 0,
      misc:      Number(data.misc)      || 0,
      jobWork:   Number(data.jobWork)   || 0,
      packaging: Number(data.packaging) || 0,
      design:    Number(data.design)    || 0,
      ribCost:   Number(data.ribCost)   || 0,
      stage: "design",
      priority: (data.priority as Priority) ?? "Normal",
      timeline: { create: STAGES.map(s => ({ stage: s, done: false, date: null })) },
    },
    include: { notes: true, timeline: true },
  });

  const rev  = Number(order.saleValue);
  const cost = Number(order.fabric) + Number(order.printing) + Number(order.transport) +
    Number(order.misc) + Number(order.jobWork) + Number(order.packaging) +
    Number(order.design) + Number(order.ribCost);

  return {
    ok: true, id: order.id, clientName: order.clientName,
    saleValue: rev, totalCost: cost,
    grossProfit: rev - cost,
    marginPct: rev > 0 ? Math.round(((rev - cost) / rev) * 1000) / 10 : 0,
  };
}

export async function updateOrder(orderId: string, updates: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (updates.saleValue  !== undefined) data.saleValue  = Number(updates.saleValue);
  if (updates.gst        !== undefined) data.gst        = Number(updates.gst);
  if (updates.qty        !== undefined) data.qty        = Number(updates.qty);
  if (updates.fabric     !== undefined) data.fabric     = Number(updates.fabric);
  if (updates.printing   !== undefined) data.printing   = Number(updates.printing);
  if (updates.transport  !== undefined) data.transport  = Number(updates.transport);
  if (updates.misc       !== undefined) data.misc       = Number(updates.misc);
  if (updates.jobWork    !== undefined) data.jobWork    = Number(updates.jobWork);
  if (updates.packaging  !== undefined) data.packaging  = Number(updates.packaging);
  if (updates.design     !== undefined) data.design     = Number(updates.design);
  if (updates.ribCost    !== undefined) data.ribCost    = Number(updates.ribCost);
  if (updates.priority   !== undefined) data.priority   = updates.priority as Priority;
  if (updates.stage      !== undefined) data.stage      = updates.stage as Stage;
  if (updates.dueDate    !== undefined) data.dueDate    = updates.dueDate ? new Date(updates.dueDate as string) : null;
  if (updates.clientName !== undefined) data.clientName = updates.clientName;
  if (updates.product    !== undefined) data.product    = updates.product;

  const order = await prisma.order.update({ where: { id: orderId }, data });
  return { ok: true, id: order.id, updated: Object.keys(data) };
}
