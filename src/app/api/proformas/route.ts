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

  const proformas = await prisma.proforma.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(proformas);
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkPerm(user.id, "quotes", "create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Generate ref server-side to avoid client count collisions
  const yr = new Date().getFullYear();
  const prefix = `PF/${String(yr).slice(-2)}-${String(yr + 1).slice(-2)}/`;
  const latest = await prisma.proforma.findFirst({
    where: { ref: { startsWith: prefix } },
    orderBy: { ref: "desc" },
    select: { ref: true },
  });
  const lastSeq = latest?.ref ? (parseInt(latest.ref.split("/").pop() ?? "0") || 0) : 0;
  const ref = `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;

  const proforma = await prisma.proforma.create({
    data: {
      ref,
      date: body.date,
      clientId: body.clientId ?? null,
      clientName: body.clientName,
      data: body.data,
    },
  });
  return NextResponse.json(proforma, { status: 201 });
}
