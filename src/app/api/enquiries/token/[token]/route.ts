import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";

// Public endpoint — no auth, accessed via shareable link
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const enquiry = await prisma.enquiry.findUnique({
    where: { token },
    include: { files: true },
  });
  if (!enquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(enquiry);
}

// Client updates: contact info, client approval, size data
export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();

  const enquiry = await prisma.enquiry.findUnique({ where: { token } });
  if (!enquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.enquiry.update({
    where: { token },
    data: {
      clientName: body.clientName ?? enquiry.clientName,
      clientEmail: body.clientEmail ?? enquiry.clientEmail,
      clientPhone: body.clientPhone ?? enquiry.clientPhone,
      clientApproved: body.clientApproved ?? enquiry.clientApproved,
      sizeColumns: body.sizeColumns ?? undefined,
      sizeRows: body.sizeRows ?? undefined,
    },
    include: { files: true },
  });

  // Telegram: notify on client approval
  if (body.clientApproved && !enquiry.clientApproved) {
    const name = updated.clientName ?? "Client";
    await sendTelegram(`✅ <b>Design Approved</b>\n${name} approved the design for enquiry: <b>${enquiry.title}</b>`);
  }

  return NextResponse.json(updated);
}

// Client file upload record
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const enquiry = await prisma.enquiry.findUnique({ where: { token } });
  if (!enquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const file = await prisma.enquiryFile.create({
    data: {
      enquiryId: enquiry.id,
      label: body.label ?? "Reference",
      path: body.path,
      url: body.url,
      uploadedBy: "client",
    },
  });

  const name = enquiry.clientName ?? "Client";
  await sendTelegram(`📎 <b>File Uploaded by Client</b>\n${name} uploaded a file for enquiry: <b>${enquiry.title}</b>\nLabel: ${file.label}`);

  return NextResponse.json(file);
}
