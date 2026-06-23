import express from "express";
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

async function getUserFromJwt(req: express.Request): Promise<string | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "Authorization": auth,
      "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ?? null;
}

async function sendWhatsApp(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}

// ── CRM agent endpoints ────────────────────────────────────────────────────

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

// ── WhatsApp webhook ───────────────────────────────────────────────────────

// Meta verification handshake
app.get("/whatsapp", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Incoming messages
app.post("/whatsapp", async (req, res) => {
  res.sendStatus(200); // acknowledge immediately

  try {
    const entry   = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const msg     = changes?.value?.messages?.[0];

    if (!msg || msg.type !== "text") return;

    const from = msg.from; // sender's WhatsApp number
    const text = msg.text.body.trim();

    console.log(`WhatsApp from ${from}: ${text}`);

    const reply = await runAgent(`wa:${from}`, text);
    await sendWhatsApp(from, reply);
  } catch (err) {
    console.error("WhatsApp error:", err);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Harvey running on port ${PORT}`));
