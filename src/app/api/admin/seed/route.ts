import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ADMIN_EMAIL = "theprintribe@gmail.com";

// One-time route to seed the owner account as admin.
// Safe to call multiple times (upsert).
export async function POST() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const owner = data.users.find(u => u.email === ADMIN_EMAIL);
  if (!owner) return NextResponse.json({ error: "Owner account not found in Supabase" }, { status: 404 });

  const DEFAULT_SECTIONS = {
    dashboard: true, orders: true, clients: true, vendors: true,
    products: true, assets: true, quotes: true, production: true,
  };

  await prisma.userPermission.upsert({
    where: { userId: owner.id },
    update: { role: "admin" },
    create: { userId: owner.id, email: ADMIN_EMAIL, role: "admin", sections: DEFAULT_SECTIONS },
  });

  return NextResponse.json({ ok: true, userId: owner.id });
}
