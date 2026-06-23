import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const perm = await prisma.userPermission.findUnique({ where: { userId: user.id } });
  if (!perm || perm.role !== "admin") return null;
  return user;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Admins always have full access — their permissions cannot be changed via UI
  const target = await prisma.userPermission.findUnique({ where: { userId: id } });
  if (target?.role === "admin") return NextResponse.json({ error: "Admin permissions cannot be changed" }, { status: 403 });

  const body = await req.json();

  const updated = await prisma.userPermission.update({
    where: { userId: id },
    data: {
      ...(body.sections !== undefined && { sections: body.sections }),
      ...(body.showFinancials !== undefined && { showFinancials: body.showFinancials }),
      ...(body.showHarvey !== undefined && { showHarvey: body.showHarvey }),
      ...(body.role !== undefined && { role: body.role }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === admin.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  await supabaseAdmin.auth.admin.deleteUser(id);
  await prisma.userPermission.delete({ where: { userId: id } });

  return NextResponse.json({ ok: true });
}
