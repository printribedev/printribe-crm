import { prisma } from "@/lib/prisma";
import { Stage, Priority } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

// ── helpers ──────────────────────────────────────────────────────────────────

function calcMargin(o: {
  saleValue: unknown; fabric: unknown; printing: unknown; transport: unknown;
  misc: unknown; jobWork: unknown; packaging: unknown; design: unknown; ribCost: unknown;
}) {
  const rev = Number(o.saleValue);
  const cost = Number(o.fabric) + Number(o.printing) + Number(o.transport) +
    Number(o.misc) + Number(o.jobWork) + Number(o.packaging) +
    Number(o.design) + Number(o.ribCost);
  const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
  return { totalCost: cost, grossProfit: rev - cost, marginPct: Math.round(margin * 10) / 10 };
}

function fyDateRange(fy: string): { gte: Date; lte: Date } {
  const year = parseInt(fy.split("-")[0]);
  return { gte: new Date(`${year}-04-01`), lte: new Date(`${year + 1}-03-31T23:59:59`) };
}

function periodDateRange(period: string): { gte: Date; lte: Date } {
  const now = new Date();
  if (period === "this_month") {
    return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lte: now };
  }
  if (period === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { gte: start, lte: end };
  }
  if (period === "fy_current") {
    const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return { gte: new Date(`${fyStart}-04-01`), lte: now };
  }
  // all_time
  return { gte: new Date("2020-01-01"), lte: now };
}

// ── tool implementations ──────────────────────────────────────────────────────

export async function get_orders(filters: {
  client?: string; stage?: string; fy?: string; priority?: string; limit?: number;
}) {
  const orders = await prisma.order.findMany({
    where: {
      ...(filters.client && { clientName: { contains: filters.client, mode: "insensitive" } }),
      ...(filters.stage  && { stage: filters.stage as Stage }),
      ...(filters.priority && { priority: filters.priority as Priority }),
      ...(filters.fy && { date: fyDateRange(filters.fy) }),
    },
    include: { notes: { orderBy: { ts: "desc" }, take: 1 } },
    orderBy: { date: "desc" },
    take: filters.limit ?? 20,
  });
  return orders.map(o => ({
    id: o.id, clientName: o.clientName, product: o.product,
    qty: o.qty, stage: o.stage, priority: o.priority,
    date: o.date.toISOString().split("T")[0],
    dueDate: o.dueDate?.toISOString().split("T")[0] ?? null,
    saleValue: Number(o.saleValue),
    ...calcMargin(o),
    latestNote: o.notes[0]?.text ?? null,
  }));
}

export async function get_order_detail(orderId: string) {
  const o = await prisma.order.findUnique({
    where: { id: orderId },
    include: { notes: { orderBy: { ts: "desc" } }, timeline: true },
  });
  if (!o) return { error: `Order ${orderId} not found` };
  return {
    id: o.id, clientName: o.clientName, product: o.product,
    qty: o.qty, stage: o.stage, priority: o.priority,
    date: o.date.toISOString().split("T")[0],
    dueDate: o.dueDate?.toISOString().split("T")[0] ?? null,
    saleValue: Number(o.saleValue), gst: Number(o.gst),
    costs: {
      fabric: Number(o.fabric), printing: Number(o.printing),
      transport: Number(o.transport), misc: Number(o.misc),
      jobWork: Number(o.jobWork), packaging: Number(o.packaging),
      design: Number(o.design), ribCost: Number(o.ribCost),
    },
    ...calcMargin(o),
    notes: o.notes.map(n => ({ text: n.text, date: n.ts.toISOString().split("T")[0] })),
    timeline: o.timeline.map(t => ({ stage: t.stage, done: t.done, date: t.date?.toISOString().split("T")[0] ?? null })),
  };
}

export async function get_clients(filters: { segment?: string; search?: string }) {
  const clients = await prisma.client.findMany({
    where: {
      ...(filters.segment && { segment: filters.segment as never }),
      ...(filters.search  && { name: { contains: filters.search, mode: "insensitive" } }),
    },
    include: { orders: { select: { saleValue: true, date: true, stage: true } } },
    orderBy: { name: "asc" },
  });
  return clients.map(c => {
    const totalFromOrders = c.orders.reduce((s, o) => s + Number(o.saleValue), 0);
    const dates = c.orders.map(o => o.date).sort((a, b) => b.getTime() - a.getTime());
    return {
      id: c.id, name: c.name, segment: c.segment, city: c.city ?? null,
      phone: c.phone ?? null, email: c.email ?? null,
      totalValue: c.totalValueOverride ? Number(c.totalValueOverride) : totalFromOrders,
      orderCount: c.ordersOverride ?? c.orders.length,
      lastOrder: dates[0]?.toISOString().split("T")[0] ?? null,
      activeOrders: c.orders.filter(o => o.stage !== "delivered").length,
    };
  });
}

export async function get_production_jobs(filters: { stage?: string; priority?: string }) {
  const jobs = await prisma.order.findMany({
    where: {
      stage: filters.stage
        ? (filters.stage as Stage)
        : { notIn: ["delivered", "delivered_pending"] as Stage[] },
      ...(filters.priority && { priority: filters.priority as Priority }),
    },
    include: { notes: { orderBy: { ts: "desc" }, take: 1 } },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
  const now = new Date();
  return jobs.map(o => ({
    id: o.id, clientName: o.clientName, product: o.product,
    qty: o.qty, stage: o.stage, priority: o.priority,
    dueDate: o.dueDate?.toISOString().split("T")[0] ?? null,
    overdue: o.dueDate ? o.dueDate < now : false,
    latestNote: o.notes[0]?.text ?? null,
  }));
}

export async function get_financials(period: string) {
  const range = periodDateRange(period);
  const agg = await prisma.order.aggregate({
    where: { date: range },
    _sum: {
      saleValue: true, gst: true, fabric: true, printing: true,
      transport: true, misc: true, jobWork: true, packaging: true,
      design: true, ribCost: true,
    },
    _count: { id: true },
  });
  const rev  = Number(agg._sum.saleValue ?? 0);
  const cost = Number(agg._sum.fabric ?? 0) + Number(agg._sum.printing ?? 0) +
    Number(agg._sum.transport ?? 0) + Number(agg._sum.misc ?? 0) +
    Number(agg._sum.jobWork ?? 0) + Number(agg._sum.packaging ?? 0) +
    Number(agg._sum.design ?? 0) + Number(agg._sum.ribCost ?? 0);
  return {
    period, from: range.gte.toISOString().split("T")[0], to: range.lte.toISOString().split("T")[0],
    orderCount: agg._count.id,
    revenue: rev, gstCollected: Number(agg._sum.gst ?? 0),
    totalCost: cost, grossProfit: rev - cost,
    marginPct: rev > 0 ? Math.round(((rev - cost) / rev) * 1000) / 10 : 0,
  };
}

export async function get_vendors() {
  const vendors = await prisma.vendor.findMany({ orderBy: { totalPurchased: "desc" } });
  return vendors.map(v => ({
    id: v.id, name: v.name, type: v.type, category: v.category,
    city: v.city, reliability: v.reliability,
    totalPurchased: Number(v.totalPurchased),
  }));
}

export async function get_products(search?: string) {
  const products = await prisma.product.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    select: { id: true, name: true, gstRate: true, basePrice: true, hsn: true },
  });
  return products.map(p => ({
    id: p.id, name: p.name, gstRate: p.gstRate,
    basePrice: Number(p.basePrice), hsn: p.hsn,
  }));
}

export async function create_order(data: {
  clientName: string; product: string; qty: number; saleValue: number; gst?: number;
  fabric?: number; printing?: number; transport?: number; misc?: number;
  jobWork?: number; packaging?: number; design?: number; ribCost?: number;
  segment?: string; priority?: string; date?: string; dueDate?: string;
}) {
  // Resolve product from catalog
  const catalogProduct = await prisma.product.findFirst({
    where: { name: { contains: data.product, mode: "insensitive" } },
    select: { name: true, gstRate: true },
  });

  if (!catalogProduct) {
    const available = await prisma.product.findMany({ select: { name: true }, orderBy: { name: "asc" } });
    return {
      error: "product_not_found",
      message: `"${data.product}" isn't in the product catalog. Please create it first in the Products section, or pick from the existing ones.`,
      availableProducts: available.map(p => p.name),
    };
  }

  const gst = data.gst ?? (Number(data.saleValue) * (parseFloat(catalogProduct.gstRate) || 5) / 100);
  const { createOrder } = await import("@/lib/orders");
  return createOrder({ ...data, product: catalogProduct.name, gst });
}

export async function update_order(orderId: string, updates: Record<string, unknown>) {
  const { updateOrder } = await import("@/lib/orders");
  return updateOrder(orderId, updates);
}

export async function update_order_stage(orderId: string, stage: string) {
  if (!Object.values(Stage).includes(stage as Stage)) {
    return { error: `Invalid stage "${stage}". Valid: ${Object.values(Stage).join(", ")}` };
  }
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { stage: stage as Stage } }),
    prisma.orderTimeline.updateMany({
      where: { orderId, stage: stage as Stage },
      data: { done: true, date: new Date() },
    }),
  ]);
  return { ok: true, orderId, newStage: stage };
}

export async function add_order_note(orderId: string, note: string) {
  const created = await prisma.orderNote.create({
    data: { orderId, text: note, author: "Usman", ts: new Date() },
  });
  return { ok: true, noteId: created.id, orderId, text: note };
}

// ── tool definitions for Claude ───────────────────────────────────────────────

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "get_orders",
    description: "Fetch orders with optional filters. Returns orders with margin calculations.",
    input_schema: {
      type: "object" as const,
      properties: {
        client:   { type: "string", description: "Filter by client name (partial match)" },
        stage:    { type: "string", description: "Filter by stage: design, sampling, production, qc, dispatch, delivered_pending, delivered" },
        fy:       { type: "string", description: "Filter by financial year e.g. '2026-27'" },
        priority: { type: "string", description: "Filter by priority: Normal or High" },
        limit:    { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "get_order_detail",
    description: "Get full details of a single order including all costs, notes, and timeline.",
    input_schema: {
      type: "object" as const,
      properties: {
        orderId: { type: "string", description: "The exact order ID" },
      },
      required: ["orderId"],
    },
  },
  {
    name: "get_clients",
    description: "Fetch clients with their order stats.",
    input_schema: {
      type: "object" as const,
      properties: {
        segment: { type: "string", description: "Filter by segment: Reseller, Sports, Education, Corporate, NGO_Govt, B2C" },
        search:  { type: "string", description: "Search by client name (partial match)" },
      },
    },
  },
  {
    name: "get_production_jobs",
    description: "Fetch active production jobs (excludes delivered orders).",
    input_schema: {
      type: "object" as const,
      properties: {
        stage:    { type: "string", description: "Filter by specific stage" },
        priority: { type: "string", description: "Filter by priority: Normal or High" },
      },
    },
  },
  {
    name: "get_financials",
    description: "Get financial summary for a time period.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: { type: "string", description: "One of: this_month, last_month, fy_current, all_time" },
      },
      required: ["period"],
    },
  },
  {
    name: "get_vendors",
    description: "Fetch all vendors ordered by total purchased.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_products",
    description: "Fetch products from the catalog. Use to check if a product exists before creating an order.",
    input_schema: {
      type: "object" as const,
      properties: {
        search: { type: "string", description: "Optional product name search" },
      },
    },
  },
  {
    name: "create_order",
    description: "Create a new order. GST is auto-resolved from the product catalog — do NOT ask the user for it.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientName: { type: "string" }, product:   { type: "string" },
        qty:        { type: "number" }, saleValue: { type: "number" },
        gst:        { type: "number", description: "Leave unset — auto-resolved from product catalog" },
        fabric:     { type: "number" }, printing:  { type: "number" },
        transport:  { type: "number" }, misc:      { type: "number" },
        jobWork:    { type: "number" }, packaging: { type: "number" },
        design:     { type: "number" }, ribCost:   { type: "number" },
        segment:    { type: "string" }, priority:  { type: "string" },
        date:       { type: "string" }, dueDate:   { type: "string" },
      },
      required: ["clientName", "product", "qty", "saleValue"],
    },
  },
  {
    name: "update_order",
    description: "Update fields on an existing order.",
    input_schema: {
      type: "object" as const,
      properties: {
        orderId: { type: "string", description: "The exact order ID" },
        updates: { type: "object", description: "Fields to update (saleValue, qty, dueDate, priority, etc.)" },
      },
      required: ["orderId", "updates"],
    },
  },
  {
    name: "update_order_stage",
    description: "Move an order to a new production stage.",
    input_schema: {
      type: "object" as const,
      properties: {
        orderId: { type: "string" },
        stage:   { type: "string", description: "New stage: design, sampling, production, qc, dispatch, delivered_pending, delivered" },
      },
      required: ["orderId", "stage"],
    },
  },
  {
    name: "add_order_note",
    description: "Add a timestamped note to an order.",
    input_schema: {
      type: "object" as const,
      properties: {
        orderId: { type: "string" },
        note:    { type: "string" },
      },
      required: ["orderId", "note"],
    },
  },
];

// ── tool executor ─────────────────────────────────────────────────────────────

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_orders":          return get_orders(input as Parameters<typeof get_orders>[0]);
    case "get_order_detail":    return get_order_detail(input.orderId as string);
    case "get_clients":         return get_clients(input as Parameters<typeof get_clients>[0]);
    case "get_production_jobs": return get_production_jobs(input as Parameters<typeof get_production_jobs>[0]);
    case "get_financials":      return get_financials(input.period as string);
    case "get_vendors":         return get_vendors();
    case "get_products":        return get_products(input.search as string | undefined);
    case "create_order":        return create_order(input as Parameters<typeof create_order>[0]);
    case "update_order":        return update_order(input.orderId as string, input.updates as Record<string, unknown>);
    case "update_order_stage":  return update_order_stage(input.orderId as string, input.stage as string);
    case "add_order_note":      return add_order_note(input.orderId as string, input.note as string);
    default: return { error: `Unknown tool: ${name}` };
  }
}
