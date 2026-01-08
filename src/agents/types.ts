import { z } from "zod";

export const PreStepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("world_build"),
    description: z
      .string()
      .describe("What new content is needed (location, NPC, lore, etc.)"),
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

export const OrchestratorDecisionSchema = z.object({
  preSteps: z
    .array(PreStepSchema)
    .describe(
      "Array of pre-steps to run before narration. Empty array means go straight to narration.",
    ),
  reasoning: z
    .string()
    .optional()
    .describe("Brief explanation of why these pre-steps are needed"),
});

export type OrchestratorDecision = z.infer<typeof OrchestratorDecisionSchema>;
