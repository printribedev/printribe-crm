import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_KEYS = ["invoice_terms", "proforma_terms"] as const;
type SettingKey = typeof ALLOWED_KEYS[number];

const DEFAULTS: Record<SettingKey, string> = {
  invoice_terms:
    "Our responsibility ceases once the goods leave our premises/factory. Goods once sold cannot be exchanged/returned. All disputes subject to Bangalore Jurisdiction Only.\nBy signing this copy/accepting delivery, you agree to the above terms of sales.\nThank you for your valuable order.",
  proforma_terms:
    "This is a proforma invoice and not a tax invoice. Goods will be dispatched only after advance payment confirmation.\nAll disputes subject to Bangalore Jurisdiction Only.\nThank you for your valuable order.",
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.businessSetting.findMany({
    where: { key: { in: [...ALLOWED_KEYS] } },
  });

  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return NextResponse.json(result);
}

export async function PUT(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Record<string, string>;

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key as SettingKey)) continue;
    await prisma.businessSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  return NextResponse.json({ ok: true });
}
