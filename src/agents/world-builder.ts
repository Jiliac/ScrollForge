import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import type { PreStep } from "./types";
import { getWorldAdvancePrompt } from "./prompts";
import { loadGameConfig } from "@/lib/game-config";
import { worldAdvanceTools } from "@/app/api/chat/tools";

export type WorldAdvanceResult = {
  summary: string;
  toolCalls: Array<{
    toolName: string;
    args: Record<string, unknown>;
  }>;
};

type WorldAdvanceStep = Extract<PreStep, { type: "world_advance" }>;

export async function runWorldAdvance(
  step: WorldAdvanceStep,
  context: string,
): Promise<WorldAdvanceResult> {
  const config = await loadGameConfig();
  const systemPrompt = getWorldAdvancePrompt(config, step.description);

  const { text, steps } = await generateText({
    model: openai("gpt-5.2"),
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `# Game Context\n\n${context}\n\n---\n\nAdvance the world: ${step.description}`,
      },
    ],
    tools: worldAdvanceTools,
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
export async function runWorldAdvanceStub(
  step: WorldAdvanceStep,
): Promise<WorldAdvanceResult> {
  return {
    summary: `(stub) would advance world: ${step.description}`,
    toolCalls: [],
  };
}
