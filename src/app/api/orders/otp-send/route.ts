import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const PRINTRIBE_EMAIL = process.env.PRINTRIBE_EMAIL ?? "theprintribe@gmail.com";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, invoiceKey: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!order.invoiceKey) return NextResponse.json({ error: "No saved invoice on this order" }, { status: 400 });

  await prisma.otp.deleteMany({ where: { orderId } });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otp.create({ data: { orderId, code, expiresAt } });

  await resend.emails.send({
    from: "Printribe CRM <onboarding@resend.dev>",
    to: PRINTRIBE_EMAIL,
    subject: `OTP to edit order ${orderId}`,
    html: `
      <p>A request was made to edit order <strong>${orderId}</strong>, which has a saved invoice.</p>
      <p>Your OTP is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p>
      <p>This code expires in 10 minutes. If you did not request this, ignore this email.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
