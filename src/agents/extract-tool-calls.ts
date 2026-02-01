export type ExtractedToolCall = {
  toolName: string;
  args: Record<string, unknown>;
};

export function extractToolCalls(
  steps: Array<Record<string, unknown>> | undefined,
): ExtractedToolCall[] {
  return (steps ?? []).flatMap((s) => {
    const toolCalls = (s.toolCalls ?? []) as Array<Record<string, unknown>>;

    return toolCalls.map((tc) => {
      const rawArgs = tc.input ?? tc.args ?? {};
      const args =
        typeof rawArgs === "object" && rawArgs !== null
          ? (rawArgs as Record<string, unknown>)
          : {};
      return { toolName: String(tc.toolName ?? ""), args };
    });
  });
}
