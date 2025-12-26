import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic("claude-opus-4-5-20251101"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
