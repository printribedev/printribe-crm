import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkPerm } from "@/lib/permissions";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function generateRef(count: number) {
  const now = new Date();
  const yr = now.getFullYear();
  const month = now.getMonth(); // 0-indexed; FY starts April (month 3)
  const fyStart = month >= 3 ? yr : yr - 1;
  const fyEnd = fyStart + 1;
  const yy1 = String(fyStart).slice(-2);
  const yy2 = String(fyEnd).slice(-2);
  return `ENQ/${yy1}-${yy2}/${String(count).padStart(3, "0")}`;
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: { files: true },
  });
  return NextResponse.json(enquiries);
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "enquiries", "create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Auto-generate ref based on total count
  const total = await prisma.enquiry.count();
  const ref = generateRef(total + 1);

  const enquiry = await prisma.enquiry.create({
    data: {
      ref,
      title: body.title,
      clientId: body.clientId ?? null,
      clientName: body.clientName ?? null,
      clientEmail: body.clientEmail ?? null,
      clientPhone: body.clientPhone ?? null,
      productId: body.productId ?? null,
      product: body.product ?? null,
      notes: body.notes ?? null,
      status: "open",
    },
    include: { files: true },
  });
  return NextResponse.json(enquiry);
}
