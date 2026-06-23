import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAgent } from "@/lib/agent/runner";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: "No message" }, { status: 400 });

    const sessionKey = `crm:${user.id}`;
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

    const { prisma } = await import("@/lib/prisma");
    await prisma.agentSession.deleteMany({ where: { key: `crm:${user.id}` } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
