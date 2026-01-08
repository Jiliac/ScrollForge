import type { PreStep } from "./types";

export type FactionTurnResult = {
  summary: string;
};

type FactionTurnStep = Extract<PreStep, { type: "faction_turn" }>;

export async function runFactionTurnStub(
  step: FactionTurnStep,
): Promise<FactionTurnResult> {
  return {
    summary: `(stub) ${step.faction} would respond to: ${step.situation}`,
  };
}
