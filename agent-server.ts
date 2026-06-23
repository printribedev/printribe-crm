import express from "express";
import { runAgent } from "./src/lib/agent/runner";
import { prisma } from "./src/lib/prisma";

const app = express();
app.use(express.json());

const SECRET = process.env.AGENT_SECRET;

function authorized(req: express.Request, res: express.Response): boolean {
  if (SECRET && req.headers["x-agent-secret"] !== SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/agent", async (req, res) => {
  if (!authorized(req, res)) return;
  try {
    const { message, sessionKey } = req.body;
    if (!message?.trim() || !sessionKey) {
      res.status(400).json({ error: "Missing message or sessionKey" });
      return;
    }
    const reply = await runAgent(sessionKey, message.trim());
    res.json({ reply });
  } catch (err) {
    console.error("Agent error:", err);
    res.json({ reply: "Sorry, I ran into an error. Please try again." });
  }
});

app.delete("/agent", async (req, res) => {
  if (!authorized(req, res)) return;
  try {
    const { sessionKey } = req.body;
    if (sessionKey) {
      await prisma.agentSession.deleteMany({ where: { key: sessionKey } });
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to clear" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Harvey running on port ${PORT}`));
