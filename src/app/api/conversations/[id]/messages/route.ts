import { type UIMessage } from "ai";
import { ensureConversationExists, saveMessages } from "@/lib/conversations";
import { getCurrentGameId } from "@/lib/game-files";
import { isZepEnabled, syncMessagesToZep } from "@/lib/zep";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  const { messages }: { messages: UIMessage[] } = await req.json();

  await ensureConversationExists(conversationId);
  await saveMessages(conversationId, messages);

  // Fire-and-forget sync to Zep (includes assistant response)
  if (isZepEnabled()) {
    getCurrentGameId()
      .then((gameId) => syncMessagesToZep(gameId, conversationId, messages))
      .catch((err) => console.error("Failed to sync messages to Zep:", err));
  }

  return Response.json({ success: true });
}
