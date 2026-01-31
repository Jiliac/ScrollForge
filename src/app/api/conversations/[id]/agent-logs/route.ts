import { getAgentLogs } from "@/lib/agent-logs";
import { requireConversationAccess } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  await requireConversationAccess(conversationId);
  const logs = await getAgentLogs(conversationId);
  return Response.json(logs);
}
