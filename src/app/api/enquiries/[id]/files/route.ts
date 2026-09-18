import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// POST /api/enquiries/[id]/files — save a file record after client-side upload
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  // Accepts: { label, path, url, uploadedBy }

  const file = await prisma.enquiryFile.create({
    data: {
      enquiryId: Number(id),
      label: body.label ?? "Other",
      path: body.path,
      url: body.url,
      uploadedBy: body.uploadedBy ?? "team",
    },
  });
  return NextResponse.json(file);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const { fileId } = await req.json();

  const file = await prisma.enquiryFile.findUnique({ where: { id: Number(fileId) } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Remove from Supabase storage
  await supabase.storage.from("enquiry-files").remove([file.path]);
  await prisma.enquiryFile.delete({ where: { id: Number(fileId) } });
  return NextResponse.json({ ok: true });
}
