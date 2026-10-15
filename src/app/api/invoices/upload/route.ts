import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@supabase/supabase-js";
import { putObject, getDownloadUrl, INVOICES_BUCKET } from "@/lib/r2";

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

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const orderId = formData.get("orderId") as string | null;

  if (!file || !orderId) return NextResponse.json({ error: "Missing file or orderId" }, { status: 400 });

  const key = `${orderId.replace(/\//g, "_")}_${Date.now()}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await putObject(INVOICES_BUCKET, key, buffer, "application/pdf");

  const url = await getDownloadUrl(INVOICES_BUCKET, key);
  return NextResponse.json({ key, url });
}
