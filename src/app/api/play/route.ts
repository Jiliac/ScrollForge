import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { requireGameAccess } from "@/lib/auth";
import { executePlayStream } from "@/lib/play-orchestrator";
import { validateRequestBody } from "@/lib/validate-chat-request";

// Allow streaming responses up to 60 seconds.
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validation = validateRequestBody(body);

  if (!validation.success) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, conversationId, gameId } = validation.data;

  let userId: string;
  try {
    userId = await requireGameAccess(gameId);
  } catch {
    return new Response(JSON.stringify({ error: "Game not found" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      await executePlayStream(writer, {
        messages,
        conversationId,
        userId,
        gameId,
      });
    },
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });

  return createUIMessageStreamResponse({ stream });
}
