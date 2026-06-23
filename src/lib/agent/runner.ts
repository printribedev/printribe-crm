import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { SYSTEM_PROMPT } from "./system-prompt";
import { TOOL_DEFINITIONS, executeTool } from "./tools";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

type Message = { role: "user" | "assistant"; content: string };

async function loadSession(key: string): Promise<Message[]> {
  const session = await prisma.agentSession.findUnique({ where: { key } });
  if (!session) return [];
  const age = Date.now() - session.updatedAt.getTime();
  if (age > SESSION_TTL_MS) return [];
  return session.messages as Message[];
}

async function saveSession(key: string, messages: Message[]) {
  await prisma.agentSession.upsert({
    where: { key },
    create: { key, messages },
    update: { messages },
  });
}

export async function runAgent(sessionKey: string, userMessage: string): Promise<string> {
  const history = await loadSession(sessionKey);
  history.push({ role: "user", content: userMessage });

  const apiMessages: Anthropic.MessageParam[] = history.map(m => ({
    role: m.role,
    content: m.content,
  }));

  let response: Anthropic.Message;

  // Agentic loop — keep calling Claude until it stops using tools
  while (true) {
    response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS,
      messages: apiMessages,
    });

    if (response.stop_reason === "end_turn") break;

    if (response.stop_reason === "tool_use") {
      // Add Claude's response (with tool_use blocks) to the message history
      apiMessages.push({ role: "assistant", content: response.content });

      // Execute all tool calls in this turn
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const result = await executeTool(block.name, block.input as Record<string, unknown>);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      // Add tool results and loop
      apiMessages.push({ role: "user", content: toolResults });
      continue;
    }

    break;
  }

  // Extract final text response
  const finalText = response!.content
    .filter(b => b.type === "text")
    .map(b => (b as Anthropic.TextBlock).text)
    .join("\n");

  // Save updated history (text only — strip tool blocks for storage efficiency)
  history.push({ role: "assistant", content: finalText });
  await saveSession(sessionKey, history);

  return finalText;
}
