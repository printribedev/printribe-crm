import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { getDownloadUrl, ENQUIRIES_BUCKET } from "@/lib/r2";

async function withMockupUrl(enquiry: Record<string, unknown> & { mockupUrl?: string | null; mockupKey?: string | null; files?: unknown[] }) {
  if (enquiry.mockupKey) {
    try {
      enquiry.mockupUrl = await getDownloadUrl(ENQUIRIES_BUCKET, enquiry.mockupKey as string);
    } catch { /* non-fatal */ }
  }
  // Attach signed URLs to files
  if (Array.isArray(enquiry.files)) {
    const { getDownloadUrl: gdu } = await import("@/lib/r2");
    enquiry.files = await Promise.all(
      (enquiry.files as Array<{ r2Key: string; [k: string]: unknown }>).map(async f => ({
        ...f,
        url: await gdu(ENQUIRIES_BUCKET, f.r2Key).catch(() => ""),
      }))
    );
  }
  return enquiry;
}

// Public endpoint — no auth
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const enquiry = await prisma.enquiry.findUnique({
    where: { token },
    include: { files: true },
  });
  if (!enquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Also fetch 4 random active products for upsell
  const allProducts = await prisma.product.findMany({ where: { active: true }, select: { id: true, name: true, description: true, imagePath: true } });
  const upsell = allProducts.sort(() => 0.5 - Math.random()).slice(0, 4).map(p => ({ ...p, images: p.imagePath ? [p.imagePath] : [] }));

  const data = await withMockupUrl(enquiry as unknown as Record<string, unknown> & { mockupUrl?: string | null; mockupKey?: string | null; files?: unknown[] });
  return NextResponse.json({ ...data, upsellProducts: upsell });
}

// Client saves step data
export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();

  const enquiry = await prisma.enquiry.findUnique({ where: { token } });
  if (!enquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Compute updated completedSteps
  const existing = new Set(enquiry.completedSteps as string[]);
  if (body.step) existing.add(body.step);
  const completedSteps = Array.from(existing);

  const updated = await prisma.enquiry.update({
    where: { token },
    data: {
      // Step 1
      clientName: body.clientName ?? undefined,
      clientEmail: body.clientEmail ?? undefined,
      clientPhone: body.clientPhone ?? undefined,
      orgName: body.orgName ?? undefined,
      // Step 2
      qty: body.qty !== undefined ? Number(body.qty) : undefined,
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
      clientNotes: body.clientNotes ?? undefined,
      // Step 4
      clientApproved: body.clientApproved ?? undefined,
      changeRequest: body.changeRequest ?? undefined,
      // Step 5
      sizeRows: body.sizeRows ?? undefined,
      nameNumberRows: body.nameNumberRows ?? undefined,
      // Progress
      completedSteps,
    },
    include: { files: true },
  });

  // Telegram notifications
  if (body.clientApproved && !enquiry.clientApproved) {
    const name = updated.clientName ?? "Client";
    await sendTelegram(`✅ <b>Design Approved</b>\n${name} approved the design for <b>${enquiry.title}</b>`);
  }
  if (body.changeRequest && body.changeRequest !== enquiry.changeRequest) {
    const name = updated.clientName ?? "Client";
    await sendTelegram(`🔄 <b>Revision Requested</b>\n${name} requested changes on <b>${enquiry.title}</b>:\n${body.changeRequest}`);
  }
  if (body.step === "confirm" && !existing.has("confirm")) {
    const name = updated.clientName ?? "Client";
    await sendTelegram(`🎉 <b>Enquiry Confirmed!</b>\n${name} confirmed their order for <b>${enquiry.title}</b>\nQty: ${updated.qty ?? "—"}`);
  }

  const data = await withMockupUrl(updated as unknown as Record<string, unknown> & { mockupUrl?: string | null; mockupKey?: string | null; files?: unknown[] });
  return NextResponse.json(data);
}
