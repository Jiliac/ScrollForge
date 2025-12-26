import { anthropic } from "@ai-sdk/anthropic";
import { streamText, type UIMessage } from "ai";

type Message = { role: "user" | "assistant"; content: string };

function convertToCoreMessages(messages: UIMessage[]): Message[] {
  return messages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content:
      msg.parts
        ?.filter(
          (part): part is { type: "text"; text: string } =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join("") ?? "",
  }));
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic("claude-opus-4-5-20251101"),
    messages: convertToCoreMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
