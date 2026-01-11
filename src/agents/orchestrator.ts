import { convertToModelMessages, generateObject, type UIMessage } from "ai";
import { OrchestratorDecisionSchema, type OrchestratorDecision } from "./types";
import { openai } from "@ai-sdk/openai";
import { ORCHESTRATOR_SYSTEM } from "./prompts";
import {
  startAgentLog,
  completeAgentLog,
  failAgentLog,
} from "@/lib/agent-logs";
import { anthropic } from "@ai-sdk/anthropic";

export async function runOrchestrator(opts: {
  gameSystem: string;
  messages: UIMessage[];
  conversationId?: string;
}): Promise<OrchestratorDecision> {
  const logId = opts.conversationId
    ? await startAgentLog(opts.conversationId, "orchestrator", {
      messageCount: opts.messages.length,
    })
    : null;

  try {
    let system = ORCHESTRATOR_SYSTEM;
    if (opts.gameSystem) system += `\n\n# Game System\n${opts.gameSystem}`;

    const modelMessages = await convertToModelMessages(opts.messages);

    let object: OrchestratorDecision;
    try {
      const result = await generateObject({
        model: openai("gpt-5.2"),
        schema: OrchestratorDecisionSchema,
        system,
        messages: modelMessages,
      });
      object = result.object;
    } catch (firstError) {
      // Retry once, passing the error so model can self-correct
      console.warn("Orchestrator first attempt failed, retrying:", firstError);
      const errorMessage =
        firstError instanceof Error ? firstError.message : String(firstError);
      const result = await generateObject({
        model: anthropic("claude-opus-4-5-20251101"),
        schema: OrchestratorDecisionSchema,
        system,
        messages: [
          ...modelMessages,
          {
            role: "user" as const,
            content: `The previous call failed with this error: ${errorMessage}. Please try again.`,
          },
        ],
      });
      object = result.object;
    }

    if (logId) {
      await completeAgentLog(logId, {
        preSteps: object.preSteps,
        suggestedTwists: object.suggestedTwists,
        reasoning: object.reasoning,
      });
    }

    return object;
  } catch (error) {
    if (logId) {
      await failAgentLog(
        logId,
        error instanceof Error ? error.message : String(error),
      );
    }
    throw error;
  }
}
