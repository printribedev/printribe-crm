import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkPerm } from "@/lib/permissions";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
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
  const enquiry = await prisma.enquiry.create({
    data: {
      title: body.title,
      clientName: body.clientName ?? null,
      clientEmail: body.clientEmail ?? null,
      clientPhone: body.clientPhone ?? null,
      product: body.product ?? null,
      notes: body.notes ?? null,
      status: body.status ?? "open",
    },
    include: { files: true },
  });
  return NextResponse.json(enquiry);
}
