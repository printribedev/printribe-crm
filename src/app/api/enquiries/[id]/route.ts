import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkPerm } from "@/lib/permissions";
import { EnquiryStatus } from "@prisma/client";
import { getDownloadUrl, ENQUIRIES_BUCKET } from "@/lib/r2";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "enquiries", "edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const enquiry = await prisma.enquiry.update({
    where: { id: Number(id) },
    data: {
      title: body.title,
      clientId: body.clientId ?? null,
      clientName: body.clientName ?? null,
      clientEmail: body.clientEmail ?? null,
      clientPhone: body.clientPhone ?? null,
      orgName: body.orgName ?? null,
      productId: body.productId ?? null,
      product: body.product ?? null,
      notes: body.notes ?? null,
      status: body.status as EnquiryStatus ?? undefined,
      teamApproved: body.teamApproved ?? undefined,
      nameNumberEnabled: body.nameNumberEnabled ?? undefined,
      sizeColumns: body.sizeColumns ?? undefined,
      sizeRows: body.sizeRows ?? undefined,
    },
    include: { files: true },
  });

  // Attach signed URLs to files
  const files = await Promise.all(
    enquiry.files.map(async f => ({ ...f, url: await getDownloadUrl(ENQUIRIES_BUCKET, f.r2Key).catch(() => "") }))
  );

  let mockupUrl = null;
  if (enquiry.mockupKey) {
    mockupUrl = await getDownloadUrl(ENQUIRIES_BUCKET, enquiry.mockupKey).catch(() => null);
  }

  return NextResponse.json({ ...enquiry, files, mockupUrl });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "enquiries", "delete")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.enquiry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
