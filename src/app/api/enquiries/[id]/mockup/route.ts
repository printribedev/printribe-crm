import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkPerm } from "@/lib/permissions";
import { putObject, deleteObject, getDownloadUrl, ENQUIRIES_BUCKET } from "@/lib/r2";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const PRINTRIBE_EMAIL = process.env.PRINTRIBE_EMAIL ?? "theprintribe@gmail.com";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST — team uploads mockup image
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "enquiries", "edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const enquiry = await prisma.enquiry.findUnique({ where: { id: Number(id) } });
  if (!enquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Delete old mockup if exists
  if (enquiry.mockupKey) {
    try { await deleteObject(ENQUIRIES_BUCKET, enquiry.mockupKey); } catch { /* non-fatal */ }
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `enquiries/${enquiry.token}/mockup_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await putObject(ENQUIRIES_BUCKET, key, buffer, file.type || "image/jpeg");

  const mockupUrl = await getDownloadUrl(ENQUIRIES_BUCKET, key);

  const updated = await prisma.enquiry.update({
    where: { id: Number(id) },
    data: { mockupKey: key, mockupUrl: key, teamApproved: true, status: "design_review" },
    include: { files: true },
  });

  // Email client if they have an email
  if (enquiry.clientEmail) {
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.printribe.in"}/enquiry/${enquiry.token}`;
    try {
      await resend.emails.send({
        from: "Printribe <noreply@printribe.in>",
        to: enquiry.clientEmail,
        subject: `Your design is ready for review — ${enquiry.title}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0F172A">
            <p style="font-size:16px">Hi ${enquiry.clientName ?? "there"},</p>
            <p>Great news! Our team has uploaded the design mockup for your order <strong>${enquiry.title}</strong>.</p>
            <p>Please review it and let us know if you approve or need any changes.</p>
            <a href="${portalUrl}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#4F46E5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Review Design →</a>
            <p style="font-size:13px;color:#64748B">If the button doesn't work, copy this link: ${portalUrl}</p>
            <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0"/>
            <p style="font-size:12px;color:#94A3B8">Printribe — Custom Print & Apparel</p>
          </div>
        `,
      });
    } catch { /* email failure is non-fatal */ }
  }

  // Return updated enquiry with fresh signed mockup URL
  return NextResponse.json({ ...updated, mockupUrl });
}

// DELETE — team removes mockup
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "enquiries", "edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const enquiry = await prisma.enquiry.findUnique({ where: { id: Number(id) } });
  if (!enquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (enquiry.mockupKey) {
    try { await deleteObject(ENQUIRIES_BUCKET, enquiry.mockupKey); } catch { /* non-fatal */ }
  }

  const updated = await prisma.enquiry.update({
    where: { id: Number(id) },
    data: { mockupKey: null, mockupUrl: null, teamApproved: false, clientApproved: false, changeRequest: null },
    include: { files: true },
  });

  return NextResponse.json(updated);
}
