import { getAgentLogs } from "@/lib/agent-logs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  const logs = await getAgentLogs(conversationId);
  return Response.json(logs);
}
