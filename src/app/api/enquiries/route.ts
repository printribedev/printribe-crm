import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkPerm } from "@/lib/permissions";
import { getDownloadUrl, ENQUIRIES_BUCKET } from "@/lib/r2";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function generateRef(count: number) {
  const now = new Date();
  const yr = now.getFullYear();
  const month = now.getMonth();
  const fyStart = month >= 3 ? yr : yr - 1;
  const fyEnd = fyStart + 1;
  return `ENQ/${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}/${String(count).padStart(3, "0")}`;
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: { files: true },
  });

  // Attach signed mockup URLs (don't sign every file — too many requests; CRM list just shows count)
  const result = await Promise.all(enquiries.map(async e => {
    let mockupUrl = null;
    if (e.mockupKey) {
      mockupUrl = await getDownloadUrl(ENQUIRIES_BUCKET, e.mockupKey).catch(() => null);
    }
    return { ...e, mockupUrl };
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "enquiries", "create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Server-side ref using max ref (same pattern as proformas)
  const now = new Date();
  const yr = now.getFullYear();
  const month = now.getMonth();
  const fyStart = month >= 3 ? yr : yr - 1;
  const fyEnd = fyStart + 1;
  const prefix = `ENQ/${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}/`;
  const latest = await prisma.enquiry.findFirst({
    where: { ref: { startsWith: prefix } },
    orderBy: { ref: "desc" },
    select: { ref: true },
  });
  const lastSeq = latest?.ref ? (parseInt(latest.ref.split("/").pop() ?? "0") || 0) : 0;
  const ref = `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;

  const enquiry = await prisma.enquiry.create({
    data: {
      ref,
      title: body.title,
      clientId: body.clientId ?? null,
      clientName: body.clientName ?? null,
      clientEmail: body.clientEmail ?? null,
      clientPhone: body.clientPhone ?? null,
      orgName: body.orgName ?? null,
      productId: body.productId ?? null,
      product: body.product ?? null,
      notes: body.notes ?? null,
      status: "open",
    },
    include: { files: true },
  });
  return NextResponse.json(enquiry, { status: 201 });
}
