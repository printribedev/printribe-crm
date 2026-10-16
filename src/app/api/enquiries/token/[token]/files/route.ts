import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { putObject, getDownloadUrl, deleteObject, ENQUIRIES_BUCKET } from "@/lib/r2";

// POST — client uploads a reference/logo/artwork file
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const enquiry = await prisma.enquiry.findUnique({ where: { token } });
  if (!enquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const label = (formData.get("label") as string) || "Reference";
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `enquiries/${token}/refs/${Date.now()}_${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await putObject(ENQUIRIES_BUCKET, key, buffer, file.type || "application/octet-stream");

  const enquiryFile = await prisma.enquiryFile.create({
    data: {
      enquiryId: enquiry.id,
      label,
      r2Key: key,
      fileName: file.name,
      uploadedBy: "client",
    },
  });

  const url = await getDownloadUrl(ENQUIRIES_BUCKET, key);
  return NextResponse.json({ ...enquiryFile, url }, { status: 201 });
}

// DELETE — client removes their own file
export async function DELETE(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const enquiry = await prisma.enquiry.findUnique({ where: { token } });
  if (!enquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { fileId } = await req.json();
  const file = await prisma.enquiryFile.findFirst({ where: { id: Number(fileId), enquiryId: enquiry.id, uploadedBy: "client" } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { await deleteObject(ENQUIRIES_BUCKET, file.r2Key); } catch { /* non-fatal */ }
  await prisma.enquiryFile.delete({ where: { id: file.id } });

  return NextResponse.json({ ok: true });
}
