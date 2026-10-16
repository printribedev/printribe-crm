import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { deleteObject, ENQUIRIES_BUCKET } from "@/lib/r2";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { fileId } = await req.json();

  const file = await prisma.enquiryFile.findFirst({ where: { id: Number(fileId), enquiryId: Number(id) } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { await deleteObject(ENQUIRIES_BUCKET, file.r2Key); } catch { /* non-fatal */ }
  await prisma.enquiryFile.delete({ where: { id: Number(fileId) } });

  return NextResponse.json({ ok: true });
}
