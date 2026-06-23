export const runtime = "edge";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RAILWAY_URL  = process.env.RAILWAY_AGENT_URL;
const AGENT_SECRET = process.env.AGENT_SECRET;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: "No message" }, { status: 400 });

    if (!RAILWAY_URL) {
      return NextResponse.json({ reply: "Harvey is not configured yet. Please set RAILWAY_AGENT_URL." });
    }

    const res = await fetch(`${RAILWAY_URL}/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-secret": AGENT_SECRET ?? "",
      },
      body: JSON.stringify({ message: message.trim(), sessionKey: `crm:${user.id}` }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Agent error:", err);
    return NextResponse.json({ reply: "Sorry, I ran into an error. Please try again." });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!RAILWAY_URL) return NextResponse.json({ ok: true });

    await fetch(`${RAILWAY_URL}/agent`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-agent-secret": AGENT_SECRET ?? "",
      },
      body: JSON.stringify({ sessionKey: `crm:${user.id}` }),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
