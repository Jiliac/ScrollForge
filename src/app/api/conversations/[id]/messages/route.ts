import { type UIMessage } from "ai";
import { ensureConversationExists, saveMessages } from "@/lib/conversations";
import { getCurrentGameId } from "@/lib/game-files";
import { isZepEnabled, addMessageToZep } from "@/lib/zep";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  const { messages }: { messages: UIMessage[] } = await req.json();

  await ensureConversationExists(conversationId);

  // Add assistant message to Zep (user message was already added in chat2)
  const latestAssistantMessage = messages.findLast((m) => m.role === "assistant");
  if (isZepEnabled() && latestAssistantMessage) {
    const gameId = await getCurrentGameId();
    // Fire-and-forget, no context needed
    addMessageToZep(gameId, conversationId, latestAssistantMessage, false).catch(
      (err) => console.error("Failed to add assistant message to Zep:", err),
    );
  }

  // Save messages to DB (zepContext was already saved by chat2)
  await saveMessages(conversationId, messages);

  return Response.json({ success: true });
}
