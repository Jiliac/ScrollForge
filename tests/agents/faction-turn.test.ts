import { describe, it, expect, vi, beforeEach } from "vitest";
import { runFactionTurn } from "@/agents/faction-turn";

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
  getFactionTurnPrompt: () => "PROMPT",
}));

vi.mock("@/app/api/chat/tools", () => ({
  factionTools: {},
}));

vi.mock("@/lib/agent-logs", () => ({
  startAgentLog: vi.fn().mockResolvedValue("log"),
  completeAgentLog: vi.fn(),
  failAgentLog: vi.fn(),
  refuseAgentLog: vi.fn(),
}));

describe("runFactionTurn", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns refused summary and logs refusal", async () => {
    const { generateText } = await import("ai");
    const { refuseAgentLog } = await import("@/lib/agent-logs");

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "REFUSED: too soon",
      steps: [],
    } as any);

    const res = await runFactionTurn(
      {
        type: "faction_turn",
        faction: "Mahmud-Tabari",
        situation: "overnight",
      },
      "CTX",
      "conv1",
    );

    expect(res.summary).toContain("(refused)");
    expect(refuseAgentLog).toHaveBeenCalledWith("log", "too soon");
  });

  it("extracts tool calls", async () => {
    const { generateText } = await import("ai");

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "did it",
      steps: [
        {
          toolCalls: [
            { toolName: "edit_file", input: { file_path: "factions.md" } },
          ],
        },
      ],
    } as any);

    const res = await runFactionTurn(
      {
        type: "faction_turn",
        faction: "Mahmud-Tabari",
        situation: "overnight",
      },
      "CTX",
      "conv1",
    );

    expect(res.toolCalls).toEqual([
      { toolName: "edit_file", args: { file_path: "factions.md" } },
    ]);
  });
});
