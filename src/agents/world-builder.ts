import type { PreStep } from "./types";

export type WorldAdvanceResult = {
  summary: string;
};

type WorldAdvanceStep = Extract<PreStep, { type: "world_advance" }>;

export async function runWorldAdvanceStub(
  step: WorldAdvanceStep,
): Promise<WorldAdvanceResult> {
  return {
    summary: `(stub) would advance world: ${step.description}`,
  };
}
