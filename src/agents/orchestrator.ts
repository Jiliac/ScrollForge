import { convertToModelMessages, generateObject, type UIMessage } from "ai";
import { OrchestratorDecisionSchema, type OrchestratorDecision } from "./types";
import { openai } from "@ai-sdk/openai";
import { ORCHESTRATOR_SYSTEM } from "./prompts";
import {
  startAgentLog,
  completeAgentLog,
  failAgentLog,
} from "@/lib/agent-logs";

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

    const { object } = await generateObject({
      model: openai("gpt-5.2"),
      schema: OrchestratorDecisionSchema,
      system,
      messages: await convertToModelMessages(opts.messages),
    });

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
