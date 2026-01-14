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

  // Sync to Zep and get updated context
  let zepContext: string | undefined;
  if (isZepEnabled()) {
    try {
      const gameId = await getCurrentGameId();
      zepContext =
        (await syncMessagesToZep(gameId, conversationId, messages, true)) ??
        undefined;
    } catch (err) {
      console.error("Failed to sync messages to Zep:", err);
    }
  }

  // Save messages and zepContext to DB
  await saveMessages(conversationId, messages, zepContext);

  return Response.json({ success: true, zepContext });
}
