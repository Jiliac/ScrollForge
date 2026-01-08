import type { PreStep } from "./types";

export type WorldBuildResult = {
  summary: string;
};

type WorldBuildStep = Extract<PreStep, { type: "world_build" }>;

export async function runWorldBuildStub(
  step: WorldBuildStep,
): Promise<WorldBuildResult> {
  return {
    summary: `(stub) would create: ${step.description}`,
  };
}
