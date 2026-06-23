import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RAILWAY_URL  = process.env.RAILWAY_AGENT_URL;  // set on Vercel once Railway is live
const AGENT_SECRET = process.env.AGENT_SECRET;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: "No message" }, { status: 400 });

    const sessionKey = `crm:${user.id}`;

    if (RAILWAY_URL) {
      // Proxy to Railway — no timeout concern, persistent server
      const res = await fetch(`${RAILWAY_URL}/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agent-secret": AGENT_SECRET ?? "",
        },
        body: JSON.stringify({ message: message.trim(), sessionKey }),
      });
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Fallback: run locally (dev / before Railway is set up)
    const { runAgent } = await import("@/lib/agent/runner");
    const reply = await runAgent(sessionKey, message.trim());
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Agent error:", err);
    return NextResponse.json(
      { reply: "Sorry, I ran into an error. Please try again." },
      { status: 200 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessionKey = `crm:${user.id}`;

    if (RAILWAY_URL) {
      await fetch(`${RAILWAY_URL}/agent`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-agent-secret": AGENT_SECRET ?? "",
        },
        body: JSON.stringify({ sessionKey }),
      });
      return NextResponse.json({ ok: true });
    }

    const { prisma } = await import("@/lib/prisma");
    await prisma.agentSession.deleteMany({ where: { key: sessionKey } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
