import { type UIMessage } from "ai";
import { saveMessages } from "@/lib/conversations";
import { requireConversationAccess } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  const { messages }: { messages: UIMessage[] } = await req.json();

  await requireConversationAccess(conversationId);
  await saveMessages(conversationId, messages);

  return Response.json({ success: true });
}
