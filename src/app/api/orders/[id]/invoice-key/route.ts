import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@supabase/supabase-js";

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await sb.auth.getUser(token);
    return user;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// PATCH — save R2 key on order after invoice PDF upload
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { invoiceKey } = await req.json();

  await prisma.order.update({ where: { id }, data: { invoiceKey } });
  return NextResponse.json({ ok: true });
}
