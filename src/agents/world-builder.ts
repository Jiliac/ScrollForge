import { defaultModel } from "@/lib/ai-model";
import { generateText, stepCountIs } from "ai";
import type { PreStep } from "./types";
import { getWorldAdvancePrompt } from "./prompts";
import { loadGameConfig } from "@/lib/game-config";
import { createWorldAdvanceTools } from "@/app/api/chat/tools";
import {
  startAgentLog,
  completeAgentLog,
  failAgentLog,
  refuseAgentLog,
} from "@/lib/agent-logs";
import { extractToolCalls } from "./extract-tool-calls";

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
  conversationId: string | undefined,
  gameId: string,
): Promise<WorldAdvanceResult> {
  const logId = conversationId
    ? await startAgentLog(conversationId, "world_advance", {
        description: step.description,
      })
    : null;

  try {
    const config = await loadGameConfig(gameId);
    const systemPrompt = getWorldAdvancePrompt(config, step.description);

    const tools = createWorldAdvanceTools(gameId);

    const { text, steps } = await generateText({
      model: defaultModel,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `# Game Context\n\n${context}\n\n---\n\nAdvance the world: ${step.description}`,
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

    const toolCalls = extractToolCalls(steps as Array<Record<string, unknown>>);

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
