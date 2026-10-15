import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { putObject, getDownloadUrl, INVOICES_BUCKET } from "@/lib/r2";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
