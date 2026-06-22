import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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

  const clientId = parseInt(id);

  const [client] = await prisma.$transaction([
    prisma.client.update({
      where: { id: clientId },
      data: {
        name: body.name,
        gstin: body.gstin || null,
        type: body.type || null,
        city: body.city || null,
        address: body.address || null,
        contact: body.contact || null,
        phone: body.phone || null,
        email: body.email || null,
        segment: body.segment,
        lastOrder: body.lastOrder || null,
        totalValueOverride: body.totalValueOverride !== "" && body.totalValueOverride !== null
          ? Number(body.totalValueOverride) : null,
        ordersOverride: body.ordersOverride !== "" && body.ordersOverride !== null
          ? Number(body.ordersOverride) : null,
      },
    }),
    prisma.order.updateMany({
      where: { clientId },
      data: { segment: body.segment },
    }),
  ]);

  return NextResponse.json(client);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orderCount = await prisma.order.count({ where: { clientId: parseInt(id) } });

  if (orderCount > 0) {
    return NextResponse.json(
      { error: `This client has ${orderCount} order${orderCount > 1 ? "s" : ""}. Delete the orders first before removing the client.` },
      { status: 409 }
    );
  }

  await prisma.client.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
