import { prisma } from "./prisma";
import type { AgentType } from "@/generated/prisma/client";

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

export async function completeAgentLog(
  logId: string | null,
  output: Record<string, unknown>,
): Promise<void> {
  if (!logId) return;

  try {
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
  } catch (err) {
    console.warn(`completeAgentLog failed for ${logId}:`, err);
  }
}

export async function failAgentLog(
  logId: string | null,
  error: string,
): Promise<void> {
  if (!logId) return;

  try {
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
  } catch (err) {
    console.warn(`failAgentLog failed for ${logId}:`, err);
  }
}

export async function refuseAgentLog(
  logId: string | null,
  reason: string,
): Promise<void> {
  if (!logId) return;

  try {
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
  } catch (err) {
    console.warn(`refuseAgentLog failed for ${logId}:`, err);
  }
}
