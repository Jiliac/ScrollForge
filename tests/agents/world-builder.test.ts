import { describe, it, expect, vi, beforeEach } from "vitest";
import { runWorldAdvance } from "@/agents/world-builder";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  stepCountIs: () => ({}),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: () => ({}),
}));

vi.mock("@/lib/game-config", () => ({
  loadGameConfig: vi.fn().mockResolvedValue({
    setting: { name: "X", era: "Y" },
    player: { name: "P", role: "R" },
    tone: { style_inspiration: "S", keywords: ["k"] },
    world: { institutions: [], location_types: [], atmosphere: "A" },
    examples: { npc_warning: "W", player_action: "PA" },
  }),
}));

vi.mock("@/agents/prompts", () => ({
  getWorldAdvancePrompt: () => "PROMPT",
}));

vi.mock("@/app/api/chat/tools", () => ({
  worldAdvanceTools: {},
}));

vi.mock("@/lib/agent-logs", () => ({
  startAgentLog: vi.fn().mockResolvedValue("log"),
  completeAgentLog: vi.fn(),
  failAgentLog: vi.fn(),
  refuseAgentLog: vi.fn(),
}));

describe("runWorldAdvance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns refused summary and logs refusal", async () => {
    const { generateText } = await import("ai");
    const { refuseAgentLog } = await import("@/lib/agent-logs");

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "REFUSED: timing makes no sense",
      steps: [],
    } as any);

    const res = await runWorldAdvance(
      { type: "world_advance", description: "Advance 1 year" },
      "CTX",
      "conv1",
    );

    expect(res.summary).toContain("(refused)");
    expect(refuseAgentLog).toHaveBeenCalledWith("log", "timing makes no sense");
  });

  it("extracts tool calls from steps using input (preferred) or args (fallback)", async () => {
    const { generateText } = await import("ai");

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "ok",
      steps: [
        {
          toolCalls: [
            {
              toolName: "write_file",
              input: { file_path: "A.md", content: "x" },
            },
            {
              toolName: "edit_file",
              args: { file_path: "B.md", old_string: "o", new_string: "n" },
            },
          ],
        },
      ],
    } as any);

    const res = await runWorldAdvance(
      { type: "world_advance", description: "Do thing" },
      "CTX",
      "conv1",
    );

    expect(res.toolCalls).toEqual([
      { toolName: "write_file", args: { file_path: "A.md", content: "x" } },
      {
        toolName: "edit_file",
        args: { file_path: "B.md", old_string: "o", new_string: "n" },
      },
    ]);
  });
});
