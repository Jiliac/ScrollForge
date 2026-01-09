import { convertToModelMessages, generateObject, type UIMessage } from "ai";
import { OrchestratorDecisionSchema, type OrchestratorDecision } from "./types";
import { openai } from "@ai-sdk/openai";
import { ORCHESTRATOR_SYSTEM } from "./prompts";

export async function runOrchestrator(opts: {
  gameSystem: string;
  messages: UIMessage[];
}): Promise<OrchestratorDecision> {
  let system = ORCHESTRATOR_SYSTEM;
  if (opts.gameSystem) system += `\n\n# Game System\n${opts.gameSystem}`;

  const { object } = await generateObject({
    model: openai("gpt-5.2"),
    schema: OrchestratorDecisionSchema,
    system,
    messages: await convertToModelMessages(opts.messages),
  });

  return object;
}
