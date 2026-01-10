import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import type { PreStep } from "./types";
import { getFactionTurnPrompt } from "./prompts";
import { loadGameConfig } from "@/lib/game-config";
import { factionTools } from "@/app/api/chat/tools";
import {
  startAgentLog,
  completeAgentLog,
  failAgentLog,
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
  conversationId?: string,
): Promise<FactionTurnResult> {
  const logId = conversationId
    ? await startAgentLog(conversationId, "faction_turn", {
        faction: step.faction,
        situation: step.situation,
      })
    : null;

  try {
    const config = await loadGameConfig();
    const systemPrompt = getFactionTurnPrompt(
      config,
      step.faction,
      step.situation,
    );

    const { text, steps } = await generateText({
      model: openai("gpt-5.2"),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `# Game Context\n\n${context}\n\n---\n\nYou are ${step.faction}. What do you do?`,
        },
      ],
      tools: factionTools,
      stopWhen: stepCountIs(5),
    });

    // Extract all tool calls from all steps (with null-safe access)
    // Note: AI SDK uses "input" for tool call arguments, not "args"
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

// Keep stub for backwards compatibility during transition
export async function runFactionTurnStub(
  step: FactionTurnStep,
): Promise<FactionTurnResult> {
  return {
    summary: `(stub) ${step.faction} would respond to: ${step.situation}`,
    toolCalls: [],
  };
}
