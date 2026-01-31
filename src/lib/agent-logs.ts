import { prisma } from "./prisma";
import type { AgentType, AgentLogStatus } from "@/generated/prisma/client";

export async function startAgentLog(
  conversationId: string,
  agentType: AgentType,
  input?: Record<string, unknown>,
): Promise<string | null> {
  try {
    const log = await prisma.agentLog.create({
      data: {
        conversationId,
        agentType,
        input: input ? JSON.stringify(input) : null,
      },
    });
    return log.id;
  } catch (err) {
    console.warn("startAgentLog failed:", err);
    return null;
  }
}

async function finishAgentLog(
  callerName: string,
  logId: string | null,
  status: AgentLogStatus,
  extras: { output?: string; error?: string },
): Promise<void> {
  if (!logId) return;

  try {
    const log = await prisma.agentLog.findUnique({
      where: { id: logId },
      select: { startedAt: true },
    });

    if (!log) {
      console.warn(`${callerName}: log ${logId} not found, skipping`);
      return;
    }

    const now = new Date();
    const durationMs = now.getTime() - log.startedAt.getTime();

    await prisma.agentLog.update({
      where: { id: logId },
      data: { status, completedAt: now, durationMs, ...extras },
    });
  } catch (err) {
    console.warn(`${callerName} failed for ${logId}:`, err);
  }
}

export async function completeAgentLog(
  logId: string | null,
  output: Record<string, unknown>,
): Promise<void> {
  return finishAgentLog("completeAgentLog", logId, "completed", {
    output: JSON.stringify(output),
  });
}

export async function failAgentLog(
  logId: string | null,
  error: string,
): Promise<void> {
  return finishAgentLog("failAgentLog", logId, "failed", { error });
}

export async function refuseAgentLog(
  logId: string | null,
  reason: string,
): Promise<void> {
  return finishAgentLog("refuseAgentLog", logId, "refused", { error: reason });
}
