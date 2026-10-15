import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const PRINTRIBE_EMAIL = process.env.PRINTRIBE_EMAIL ?? "theprintribe@gmail.com";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST /api/orders/[id]/otp — generate & send OTP
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, invoiceKey: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!order.invoiceKey) return NextResponse.json({ error: "No saved invoice on this order" }, { status: 400 });

  // Clean up any existing OTPs for this order
  await prisma.otp.deleteMany({ where: { orderId: id } });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.otp.create({ data: { orderId: id, code, expiresAt } });

  await resend.emails.send({
    from: "Printribe CRM <onboarding@resend.dev>",
    to: PRINTRIBE_EMAIL,
    subject: `OTP to edit order ${id}`,
    html: `
      <p>A request was made to edit order <strong>${id}</strong>, which has a saved invoice.</p>
      <p>Your OTP is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p>
      <p>This code expires in 10 minutes. If you did not request this, ignore this email.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}

// PUT /api/orders/[id]/otp — verify OTP + save pending edit + clear invoiceKey
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { code, pendingEdit } = await req.json();

  const otp = await prisma.otp.findFirst({ where: { orderId: id }, orderBy: { createdAt: "desc" } });
  if (!otp) return NextResponse.json({ error: "No OTP found. Please request a new one." }, { status: 400 });
  if (otp.code !== code) return NextResponse.json({ error: "Incorrect OTP." }, { status: 400 });
  if (otp.expiresAt < new Date()) return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });

  // Delete used OTP
  await prisma.otp.delete({ where: { id: otp.id } });

  // Save the pending edit and clear invoiceKey
  const updated = await prisma.order.update({
    where: { id },
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
