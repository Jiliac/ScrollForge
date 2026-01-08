import { convertToModelMessages, generateObject, type UIMessage } from "ai";
import { OrchestratorDecisionSchema, type OrchestratorDecision } from "./types";
import { openai } from "@ai-sdk/openai";

const ORCHESTRATOR_SYSTEM = `You are the Orchestrator for an RPG multi-agent system.

Your job: decide what pre-steps (if any) are needed before narration.

Pre-step types:
- "world_build": New content is needed (NPC, location, lore) that doesn't exist yet.
- "faction_turn": Time passes or off-screen factions should advance their goals.

You can request multiple pre-steps. For example:
- Multiple factions acting during a time skip
- World building + faction turns if the player travels somewhere new and time passes

Return an empty array if no pre-steps are needed and we should go straight to narration.`;

export async function runOrchestrator(opts: {
  gameSystem: string;
  messages: UIMessage[];
}): Promise<OrchestratorDecision> {
  const system = opts.gameSystem
    ? `${ORCHESTRATOR_SYSTEM}\n\n# Game System\n${opts.gameSystem}`
    : ORCHESTRATOR_SYSTEM;

  const { object } = await generateObject({
    model: openai("gpt-5.2"),
    schema: OrchestratorDecisionSchema,
    system,
    messages: await convertToModelMessages(opts.messages),
  });

  return object;
}
