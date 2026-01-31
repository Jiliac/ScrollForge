import { type UIMessage } from "ai";
import { ensureConversationExists, saveMessages } from "@/lib/conversations";
import { getOrCreateUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  const { messages }: { messages: UIMessage[] } = await req.json();

  const user = await getOrCreateUser();

  await ensureConversationExists(conversationId, user.id);
  await saveMessages(conversationId, messages);

  return Response.json({ success: true });
}
