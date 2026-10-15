import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, code, pendingEdit } = await req.json();
  if (!orderId || !code) return NextResponse.json({ error: "Missing orderId or code" }, { status: 400 });

  const otp = await prisma.otp.findFirst({ where: { orderId }, orderBy: { createdAt: "desc" } });
  if (!otp) return NextResponse.json({ error: "No OTP found. Please request a new one." }, { status: 400 });
  if (otp.code !== code) return NextResponse.json({ error: "Incorrect OTP." }, { status: 400 });
  if (otp.expiresAt < new Date()) return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });

  await prisma.otp.delete({ where: { id: otp.id } });

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...pendingEdit,
      invoiceKey: null,
      qty: pendingEdit.qty !== undefined ? Number(pendingEdit.qty) : undefined,
      saleValue: pendingEdit.saleValue !== undefined ? Number(pendingEdit.saleValue) : undefined,
      gst: pendingEdit.gst !== undefined ? Number(pendingEdit.gst) : undefined,
    },
    include: { notes: true, timeline: true },
  });

  return NextResponse.json(updated);
}
