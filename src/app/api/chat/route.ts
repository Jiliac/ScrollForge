import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: anthropic("claude-opus-4-5-20251101"),
    messages,
  });

  return result.toUIMessageStreamResponse();
}
