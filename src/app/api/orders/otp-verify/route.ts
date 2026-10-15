import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { deleteObject, INVOICES_BUCKET } from "@/lib/r2";

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

  // Delete the old invoice PDF from R2 before clearing the key
  const existing = await prisma.order.findUnique({ where: { id: orderId }, select: { invoiceKey: true } });
  if (existing?.invoiceKey) {
    try { await deleteObject(INVOICES_BUCKET, existing.invoiceKey); } catch { /* non-fatal */ }
  }

  const b = pendingEdit;
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      clientId: b.clientId ? Number(b.clientId) : null,
      clientName: b.clientName,
      product: b.product,
      segment: b.segment,
      date: new Date(b.date),
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      qty: Number(b.qty),
      saleValue: Number(b.saleValue),
      gst: Number(b.gst),
      fabric: Number(b.fabric) || 0,
      printing: Number(b.printing) || 0,
      transport: Number(b.transport) || 0,
      misc: Number(b.misc) || 0,
      jobWork: Number(b.jobWork) || 0,
      packaging: Number(b.packaging) || 0,
      design: Number(b.design) || 0,
      ribCost: Number(b.ribCost) || 0,
      fabricWeightPerPc: b.fabricWeightPerPc != null ? Number(b.fabricWeightPerPc) : null,
      fabricPricePerKg: b.fabricPricePerKg != null ? Number(b.fabricPricePerKg) : null,
      ribWeightPerPc: b.ribWeightPerPc != null ? Number(b.ribWeightPerPc) : null,
      ribPricePerKg: b.ribPricePerKg != null ? Number(b.ribPricePerKg) : null,
      stage: b.stage,
      priority: b.priority,
      deliveryDate: b.deliveryDate ? new Date(b.deliveryDate) : null,
      paymentDate: b.paymentDate ? new Date(b.paymentDate) : null,
      invoiceKey: null,
    },
    include: { notes: true, timeline: true },
  });

  return NextResponse.json(updated);
}
