import { describe, it, expect, vi, beforeEach } from "vitest";
import { runArchivist } from "@/agents/archivist";

const GAME_ID = "test-game-id";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  convertToModelMessages: vi.fn().mockResolvedValue([]),
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
  getArchivistPrompt: () => "PROMPT",
}));

vi.mock("@/app/api/chat/tools", () => ({
  createArchivistTools: () => ({}),
}));

vi.mock("@/lib/agent-logs", () => ({
  startAgentLog: vi.fn().mockResolvedValue("log"),
  completeAgentLog: vi.fn(),
  failAgentLog: vi.fn(),
}));

describe("runArchivist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns summary when nothing to record", async () => {
    const { generateText } = await import("ai");

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "Nothing to record.",
      steps: [],
    } as any);

    const res = await runArchivist({
      context: "CTX",
      messages: [],
      narratorResponse: "Just a clarification",
      conversationId: "conv1",
      gameId: GAME_ID,
    });

    expect(res.summary).toBe("Nothing to record.");
    expect(res.toolCalls).toEqual([]);
    expect(res.sessionFile).toBeUndefined();
  });

  it("extracts session file from write_file tool calls", async () => {
    const { generateText } = await import("ai");

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "Recorded session",
      steps: [
        {
          toolCalls: [
            {
              toolName: "write_file",
              input: {
                file_path: "Sessions/Session_1.md",
                content: "# Session 1",
              },
            },
          ],
        },
      ],
    } as any);

    const res = await runArchivist({
      context: "CTX",
      messages: [],
      narratorResponse: "The player decided to...",
      conversationId: "conv1",
      gameId: GAME_ID,
    });

    expect(res.sessionFile).toBe("Sessions/Session_1.md");
    expect(res.toolCalls).toEqual([
      {
        toolName: "write_file",
        args: { file_path: "Sessions/Session_1.md", content: "# Session 1" },
      },
    ]);
  });

  it("extracts session file from edit_file tool calls", async () => {
    const { generateText } = await import("ai");

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "Appended to session",
      steps: [
        {
          toolCalls: [
            {
              toolName: "edit_file",
              input: {
                file_path: "Sessions/Session_2.md",
                old_string: "old",
                new_string: "old\n\n### New entry",
              },
            },
          ],
        },
      ],
    } as any);

    const res = await runArchivist({
      context: "CTX",
      messages: [],
      narratorResponse: "The player rolled twist_of_fate...",
      conversationId: "conv1",
      gameId: GAME_ID,
    });

    expect(res.sessionFile).toBe("Sessions/Session_2.md");
  });

  it("logs failure on error", async () => {
    const { generateText } = await import("ai");
    const { failAgentLog } = await import("@/lib/agent-logs");

    vi.mocked(generateText).mockRejectedValueOnce(new Error("API error"));

    await expect(
      runArchivist({
        context: "CTX",
        messages: [],
        narratorResponse: "test",
        conversationId: "conv1",
        gameId: GAME_ID,
      }),
    ).rejects.toThrow("Failed to run archivist");

    expect(failAgentLog).toHaveBeenCalledWith("log", "API error");
  });
});
