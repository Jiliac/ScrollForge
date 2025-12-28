import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { loadGameContext } from "@/lib/game-files";
import { tools } from "./tools";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const { system, context } = await loadGameContext();

  const contextMessage: UIMessage | null = context
    ? {
        id: "game-context",
        role: "user",
        parts: [{ type: "text", text: `# Game Context\n\n${context}` }],
      }
    : null;

  const allMessages = contextMessage ? [contextMessage, ...messages] : messages;

  const result = streamText({
    model: anthropic("claude-opus-4-5-20251101"),
    system: system || undefined,
    messages: await convertToModelMessages(allMessages),
    tools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return {
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
