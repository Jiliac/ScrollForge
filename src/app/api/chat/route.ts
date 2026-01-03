import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { loadGameContext } from "@/lib/game-files";
import { createConversation, saveMessages } from "@/lib/conversations";
import { tools } from "./tools";

export async function POST(req: Request) {
  const {
    messages,
    conversationId: existingConversationId,
  }: { messages: UIMessage[]; conversationId?: string } = await req.json();

  // Create conversation if not provided
  const conversationId = existingConversationId || (await createConversation());

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
    stopWhen: stepCountIs(20),
    async onFinish({ response, text }) {
      // Save all messages (user messages + new assistant message)
      // Note: We save the text content; tool calls are embedded in the stream
      const assistantMessage: UIMessage = {
        id: response.id,
        role: "assistant",
        parts: [{ type: "text", text }],
      };
      await saveMessages(conversationId, [...messages, assistantMessage]);
    },
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
