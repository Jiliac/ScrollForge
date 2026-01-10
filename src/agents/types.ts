import { z } from "zod";

export const PreStepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("world_advance"),
    description: z
      .string()
      .describe(
        "What world simulation is needed: new content (location, NPC) AND/OR thread resolution (roll maturing threads, advance clocks)",
      ),
  }),
  z.object({
    type: z.literal("faction_turn"),
    faction: z.string().describe("Which faction/NPC should act"),
    situation: z
      .string()
      .describe("What situation or time period they're responding to"),
  }),
]);

export type PreStep = z.infer<typeof PreStepSchema>;

export const SuggestedTwistSchema = z.object({
  situation: z.string().describe("What uncertain event needs resolution"),
  reason: z.string().describe("Why this needs a dice roll, not narrator fiat"),
});

export type SuggestedTwist = z.infer<typeof SuggestedTwistSchema>;

export const OrchestratorDecisionSchema = z.object({
  preSteps: z
    .array(PreStepSchema)
    .describe(
      "Array of pre-steps to run before narration. Empty array means go straight to narration.",
    ),
  suggestedTwists: z
    .array(SuggestedTwistSchema)
    .describe(
      "Short-term uncertain situations the narrator MUST roll twist_of_fate for. Only flag genuine uncertainty, not routine actions.",
    ),
  reasoning: z
    .string()
    .describe(
      "Brief explanation of decisions, or 'none' if going straight to narration with no twists.",
    ),
});

export type OrchestratorDecision = z.infer<typeof OrchestratorDecisionSchema>;
