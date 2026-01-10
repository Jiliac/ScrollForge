import { prisma } from "./prisma";
import type { AgentType, AgentLog } from "@/generated/prisma/client";

export type AgentLogEntry = {
  id: string;
  conversationId: string;
  agentType: AgentType;
  status: "running" | "completed" | "failed";
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
};

function dbToEntry(log: AgentLog): AgentLogEntry {
  return {
    id: log.id,
    conversationId: log.conversationId,
    agentType: log.agentType,
    status: log.status,
    input: log.input ? JSON.parse(log.input) : null,
    output: log.output ? JSON.parse(log.output) : null,
    error: log.error,
    startedAt: log.startedAt,
    completedAt: log.completedAt,
    durationMs: log.durationMs,
  };
}

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

  const now = new Date();
  const durationMs = log ? now.getTime() - log.startedAt.getTime() : null;

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

  const now = new Date();
  const durationMs = log ? now.getTime() - log.startedAt.getTime() : null;

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

export async function getAgentLogs(
  conversationId: string,
): Promise<AgentLogEntry[]> {
  const logs = await prisma.agentLog.findMany({
    where: { conversationId },
    orderBy: { startedAt: "asc" },
  });
  return logs.map(dbToEntry);
}
