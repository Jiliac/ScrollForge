import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import type { PreStep } from "./types";
import { getWorldAdvancePrompt } from "./prompts";
import { loadGameConfig } from "@/lib/game-config";
import { worldAdvanceTools } from "@/app/api/chat/tools";
import {
  startAgentLog,
  completeAgentLog,
  failAgentLog,
} from "@/lib/agent-logs";

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
  conversationId?: string,
): Promise<WorldAdvanceResult> {
  const logId = conversationId
    ? await startAgentLog(conversationId, "world_advance", {
        description: step.description,
      })
    : null;

  try {
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
    console.error(`Error running world advance:`, error);
    if (logId) {
      await failAgentLog(
        logId,
        error instanceof Error ? error.message : String(error),
      );
    }
    throw new Error(
      `Failed to run world advance: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
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
