import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import type { PreStep } from "./types";
import { getFactionTurnPrompt } from "./prompts";
import { loadGameConfig } from "@/lib/game-config";
import { factionTools } from "@/app/api/chat/tools";

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
): Promise<FactionTurnResult> {
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

  // Extract all tool calls from all steps
  const toolCalls = steps.flatMap((s) =>
    s.toolCalls.map((tc) => ({
      toolName: tc.toolName,
      args: "args" in tc ? (tc.args as Record<string, unknown>) : {},
    })),
  );

  return { summary: text, toolCalls };
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
