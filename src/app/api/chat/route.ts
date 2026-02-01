import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { getCurrentGame, loadGameContext } from "@/lib/game-files";
import { ensureConversationExists } from "@/lib/conversations";
import { createTools } from "./tools";
import { loadGameConfig } from "@/lib/game-config";
import { getSystemPrompt } from "@/agents/prompts";
import { defaultModel } from "@/lib/ai-model";
import { requireUserId } from "@/lib/auth";

export async function POST(req: Request) {
  const {
    messages,
    conversationId,
  }: { messages: UIMessage[]; conversationId: string } = await req.json();

  const userId = await requireUserId();
  const game = await getCurrentGame(userId);
  const gameId = game.id;

  await ensureConversationExists(conversationId, userId, gameId);

  console.log("Loading game config and context...");
  const [config, context] = await Promise.all([
    loadGameConfig(gameId),
    loadGameContext(gameId),
  ]);
  const system = getSystemPrompt(config);

  const contextMessage: UIMessage | null = context
    ? {
        id: "game-context",
        role: "user",
        parts: [{ type: "text", text: `# Game Context\n\n${context}` }],
      }
    : null;

  const allMessages = contextMessage ? [contextMessage, ...messages] : messages;

  const tools = createTools(gameId);

  const result = streamText({
    model: defaultModel,
    system: system || undefined,
    messages: await convertToModelMessages(allMessages),
    tools,
    stopWhen: stepCountIs(20),
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
