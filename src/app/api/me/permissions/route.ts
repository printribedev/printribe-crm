import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_SECTIONS = {
  dashboard: true, orders: true, clients: true, vendors: true,
  products: true, assets: true, quotes: true, production: true,
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const perm = await prisma.userPermission.findUnique({ where: { userId: user.id } });
  if (!perm) {
    return NextResponse.json({ role: "user", sections: DEFAULT_SECTIONS, showFinancials: true, showHarvey: true });
  }

  return NextResponse.json({
    role: perm.role,
    email: perm.email,
    sections: perm.sections,
    showFinancials: perm.showFinancials,
    showHarvey: perm.showHarvey,
  });
}
