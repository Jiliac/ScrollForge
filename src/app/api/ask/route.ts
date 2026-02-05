import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { loadGameContext } from "@/lib/game-files";
import { ensureConversationExists } from "@/lib/conversations";
import { createAskTools } from "../chat/tools";
import { loadGameConfig } from "@/lib/game-config";
import { getAskSystemPrompt } from "@/agents/prompts";
import { defaultModel } from "@/lib/ai-model";
import { checkGameAccess } from "@/lib/auth";
import { validateRequestBody } from "@/lib/validate-chat-request";

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = validateRequestBody(body);
  if (!validation.success) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const { messages, conversationId, gameId } = validation.data;

  const userId = await checkGameAccess(gameId);
  if (!userId) {
    return Response.json({ error: "Game not found" }, { status: 403 });
  }

  await ensureConversationExists(conversationId, userId, gameId);

  const [config, context] = await Promise.all([
    loadGameConfig(gameId),
    loadGameContext(gameId),
  ]);
  const system = getAskSystemPrompt(config);

  const contextMessage: UIMessage | null = context
    ? {
        id: "game-context",
        role: "user",
        parts: [{ type: "text", text: `# Game Context\n\n${context}` }],
      }
    : null;

  const allMessages = contextMessage ? [contextMessage, ...messages] : messages;

  const tools = createAskTools(gameId);

  const result = streamText({
    model: defaultModel,
    system: system || undefined,
    messages: await convertToModelMessages(allMessages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return {
          conversationId,
          usage: {
            inputTokens: part.totalUsage.inputTokens,
            outputTokens: part.totalUsage.outputTokens,
            totalTokens: part.totalUsage.totalTokens,
          },
        };
      }
    },
  });
}
