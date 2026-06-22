import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const host = req.headers.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const proformaUrl = `${protocol}://${host}/proforma/view?id=${encodeURIComponent(id)}`;

  let chromium: typeof import("@sparticuz/chromium-min") | undefined;
  let puppeteer: typeof import("puppeteer-core") | undefined;

  try {
    chromium = await import("@sparticuz/chromium-min");
    puppeteer = await import("puppeteer-core");
  } catch {
    return NextResponse.json({ error: "PDF generation unavailable" }, { status: 500 });
  }

  const browser = await puppeteer.default.launch({
    args: chromium.default.args,
    defaultViewport: { width: 1200, height: 1123 },
    executablePath: await chromium.default.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar"
    ),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(proformaUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForSelector(".screen-card", { timeout: 10000 });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    const safeId = id.replace(/\//g, "_");
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Proforma_${safeId}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
