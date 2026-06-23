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
  const body = await req.json();

  const updated = await prisma.userPermission.update({
    where: { userId: id },
    data: {
      ...(body.sections !== undefined && { sections: body.sections }),
      ...(body.showFinancials !== undefined && { showFinancials: body.showFinancials }),
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
