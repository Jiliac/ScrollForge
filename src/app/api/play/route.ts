import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { checkGameAccess } from "@/lib/auth";
import { executePlayStream } from "@/lib/play-orchestrator";
import { validateRequestBody } from "@/lib/validate-chat-request";

// Allow streaming responses up to 60 seconds.
export const maxDuration = 60;

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
