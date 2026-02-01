import { defaultModel } from "@/lib/ai-model";
import { generateText, stepCountIs } from "ai";
import type { PreStep } from "./types";
import { getFactionTurnPrompt } from "./prompts";
import { loadGameConfig } from "@/lib/game-config";
import { createFactionTools } from "@/app/api/chat/tools";
import {
  startAgentLog,
  completeAgentLog,
  failAgentLog,
  refuseAgentLog,
} from "@/lib/agent-logs";

export type FactionTurnResult = {
  summary: string;
  toolCalls: Array<{
    toolName: string;
    args: Record<string, unknown>;
  }>;
};

type FactionTurnStep = Extract<PreStep, { type: "faction_turn" }>;

export async function runFactionTurn(
  step: FactionTurnStep,
  context: string,
  conversationId: string | undefined,
  gameId: string,
): Promise<FactionTurnResult> {
  const logId = conversationId
    ? await startAgentLog(conversationId, "faction_turn", {
        faction: step.faction,
        situation: step.situation,
      })
    : null;

  try {
    const config = await loadGameConfig(gameId);
    const systemPrompt = getFactionTurnPrompt(
      config,
      step.faction,
      step.situation,
    );

    const tools = createFactionTools(gameId);

    const { text, steps } = await generateText({
      model: defaultModel,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `# Game Context\n\n${context}\n\n---\n\nYou are ${step.faction}. What do you do?`,
        },
      ],
      tools,
      stopWhen: stepCountIs(5),
    });

    // Check if agent refused the request
    if (text.trim().startsWith("REFUSED:")) {
      const reason = text.replace("REFUSED:", "").trim();
      if (logId) await refuseAgentLog(logId, reason);
      return { summary: `(refused) ${reason}`, toolCalls: [] };
    }

    // Extract all tool calls from all steps (with null-safe access)
    const toolCalls = (steps ?? []).flatMap((s) =>
      (s.toolCalls ?? []).map((tc) => {
        const tcAny = tc as Record<string, unknown>;
        const rawArgs = tcAny.input ?? tcAny.args ?? {};
        const args =
          typeof rawArgs === "object" && rawArgs !== null
            ? (rawArgs as Record<string, unknown>)
            : {};
        return { toolName: tc.toolName, args };
      }),
    );

    const result = { summary: text, toolCalls };
    if (logId) await completeAgentLog(logId, result);
    return result;
  } catch (error) {
    console.error(`Error running faction turn for ${step.faction}:`, error);
    if (logId) {
      await failAgentLog(
        logId,
        error instanceof Error ? error.message : String(error),
      );
    }
    throw new Error(
      `Failed to run faction turn for ${step.faction}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}
