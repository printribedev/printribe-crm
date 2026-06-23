import express from "express";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { runAgent } from "./src/lib/agent/runner";
import { prisma } from "./src/lib/prisma";

const app = express();
app.use(express.json());

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { realtime: { transport: ws } }
);

async function getUserFromJwt(req: express.Request): Promise<string | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const { data: { user } } = await supabase.auth.getUser(auth.slice(7));
  return user?.id ?? null;
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/agent", async (req, res) => {
  try {
    const userId = await getUserFromJwt(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { message } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: "Missing message" }); return; }

    const reply = await runAgent(`crm:${userId}`, message.trim());
    res.json({ reply });
  } catch (err) {
    console.error("Agent error:", err);
    res.json({ reply: "Sorry, I ran into an error. Please try again." });
  }
});

app.delete("/agent", async (req, res) => {
  try {
    const userId = await getUserFromJwt(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    await prisma.agentSession.deleteMany({ where: { key: `crm:${userId}` } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to clear" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Harvey running on port ${PORT}`));
