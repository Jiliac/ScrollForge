import { z } from "zod";

export const OrchestratorDecisionSchema = z.object({
  preStep: z.enum(["none", "world_build", "faction_turn"]),
  reason: z.string().optional(),
});

export type OrchestratorDecision = z.infer<typeof OrchestratorDecisionSchema>;
