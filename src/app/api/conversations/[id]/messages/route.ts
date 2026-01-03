import { type UIMessage } from "ai";
import { ensureConversationExists, saveMessages } from "@/lib/conversations";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  const { messages }: { messages: UIMessage[] } = await req.json();

  await ensureConversationExists(conversationId);
  await saveMessages(conversationId, messages);

  return Response.json({ success: true });
}
