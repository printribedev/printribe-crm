import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_SECTIONS = {
  dashboard: true, orders: true, clients: true, vendors: true,
  products: true, assets: true, quotes: true, production: true,
};

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const perm = await prisma.userPermission.findUnique({ where: { userId: user.id } });
  if (!perm || perm.role !== "admin") return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const perms = await prisma.userPermission.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(perms);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const perm = await prisma.userPermission.create({
    data: { userId: data.user.id, email, role: "user", sections: DEFAULT_SECTIONS },
  });

  return NextResponse.json(perm, { status: 201 });
}
