import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, generateText, type UIMessage } from "ai";
import { OrchestratorDecisionSchema, type OrchestratorDecision } from "./types";

const ORCHESTRATOR_SYSTEM = `You are the Orchestrator for an RPG multi-agent system.

Your job: decide whether this turn needs a synchronous pre-step before narration.

You must choose exactly one preStep:
- "none": go straight to narration.
- "world_build": we need new world content (new NPC/location/lore) before narration.
- "faction_turn": time passes or off-screen factions should advance before narration.

Return ONLY a single-line JSON object matching:
{"preStep":"none"|"world_build"|"faction_turn","reason":"optional short reason"}

No markdown. No extra keys.`;

export async function runOrchestrator(opts: {
  gameSystem: string;
  messages: UIMessage[];
}): Promise<OrchestratorDecision> {
  const system = opts.gameSystem
    ? `${ORCHESTRATOR_SYSTEM}\n\n# Game System\n${opts.gameSystem}`
    : ORCHESTRATOR_SYSTEM;

  const { text } = await generateText({
    model: anthropic("claude-opus-4-5-20251101"),
    system,
    messages: await convertToModelMessages(opts.messages),
    temperature: 0,
    maxRetries: 1,
  });

  try {
    const parsedJson = JSON.parse(text);
    const validated = OrchestratorDecisionSchema.safeParse(parsedJson);
    if (validated.success) return validated.data;
    return { preStep: "none", reason: "invalid orchestrator schema" };
  } catch {
    return { preStep: "none", reason: "orchestrator returned non-JSON" };
  }
}
