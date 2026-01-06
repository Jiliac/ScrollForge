export type WorldBuildResult = {
  summary: string;
};

export async function runWorldBuildStub(): Promise<WorldBuildResult> {
  return {
    summary: "(stub) world_build not implemented yet",
  };
}
