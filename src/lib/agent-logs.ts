import { prisma } from "./prisma";
import type { AgentType } from "@/generated/prisma/client";

export async function startAgentLog(
  conversationId: string,
  agentType: AgentType,
  input?: Record<string, unknown>,
): Promise<string> {
  const log = await prisma.agentLog.create({
    data: {
      conversationId,
      agentType,
      input: input ? JSON.stringify(input) : null,
    },
  });
  return log.id;
}

export async function completeAgentLog(
  logId: string,
  output: Record<string, unknown>,
): Promise<void> {
  const log = await prisma.agentLog.findUnique({
    where: { id: logId },
    select: { startedAt: true },
  });

  if (!log) {
    console.warn(`completeAgentLog: log ${logId} not found, skipping`);
    return;
  }

  const now = new Date();
  const durationMs = now.getTime() - log.startedAt.getTime();

  await prisma.agentLog.update({
    where: { id: logId },
    data: {
      status: "completed",
      output: JSON.stringify(output),
      completedAt: now,
      durationMs,
    },
  });
}

export async function failAgentLog(
  logId: string,
  error: string,
): Promise<void> {
  const log = await prisma.agentLog.findUnique({
    where: { id: logId },
    select: { startedAt: true },
  });

  if (!log) {
    console.warn(`failAgentLog: log ${logId} not found, skipping`);
    return;
  }

  const now = new Date();
  const durationMs = now.getTime() - log.startedAt.getTime();

  await prisma.agentLog.update({
    where: { id: logId },
    data: {
      status: "failed",
      error,
      completedAt: now,
      durationMs,
    },
  });
}

export async function refuseAgentLog(
  logId: string,
  reason: string,
): Promise<void> {
  const log = await prisma.agentLog.findUnique({
    where: { id: logId },
    select: { startedAt: true },
  });

  if (!log) {
    console.warn(`refuseAgentLog: log ${logId} not found, skipping`);
    return;
  }

  const now = new Date();
  const durationMs = now.getTime() - log.startedAt.getTime();

  await prisma.agentLog.update({
    where: { id: logId },
    data: {
      status: "refused",
      error: reason,
      completedAt: now,
      durationMs,
    },
  });
}
