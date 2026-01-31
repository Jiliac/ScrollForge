import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { loadGameContext } from "@/lib/game-files";
import { ensureConversationExists } from "@/lib/conversations";
import { tools } from "./tools";
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

  // Ensure conversation exists (client generates ID, server creates record if needed)
  await ensureConversationExists(conversationId, userId);

  console.log("Loading game config and context...");
  const [config, context] = await Promise.all([
    loadGameConfig(),
    loadGameContext(),
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

  const result = streamText({
    model: defaultModel,
    system: system || undefined,
    messages: await convertToModelMessages(allMessages),
    tools,
    stopWhen: stepCountIs(20),
    // Note: Messages are saved by the client after stream completes
    // to preserve full UIMessage structure including tool calls
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
