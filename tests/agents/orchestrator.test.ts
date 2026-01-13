import { describe, it, expect, vi, beforeEach } from "vitest";
import { runOrchestrator } from "@/agents/orchestrator";
import type { UIMessage } from "ai";

vi.mock("ai", () => ({
  convertToModelMessages: vi
    .fn()
    .mockResolvedValue([{ role: "user", content: "hi" }]),
  generateObject: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: () => ({}),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: () => ({}),
}));

vi.mock("@/lib/agent-logs", () => ({
  startAgentLog: vi.fn().mockResolvedValue("log"),
  completeAgentLog: vi.fn(),
  failAgentLog: vi.fn(),
}));

describe("runOrchestrator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses first model when generateObject succeeds", async () => {
    const { generateObject } = await import("ai");
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { preSteps: [], suggestedTwists: [], reasoning: "none" },
    } as any);

    const messages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "x" }] },
    ];

    const res = await runOrchestrator({
      gameSystem: "SYS",
      messages,
      conversationId: "c1",
    });
    expect(res.reasoning).toBe("none");
  });

  it("retries with anthropic if first attempt fails", async () => {
    const { generateObject } = await import("ai");
    vi.mocked(generateObject)
      .mockRejectedValueOnce(new Error("bad schema"))
      .mockResolvedValueOnce({
        object: { preSteps: [], suggestedTwists: [], reasoning: "retry ok" },
      } as any);

    const messages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "x" }] },
    ];

    const res = await runOrchestrator({
      gameSystem: "SYS",
      messages,
      conversationId: "c1",
    });
    expect(res.reasoning).toBe("retry ok");
  });

  it("falls back to safe decision if both attempts fail", async () => {
    const { generateObject } = await import("ai");
    vi.mocked(generateObject)
      .mockRejectedValueOnce(new Error("fail1"))
      .mockRejectedValueOnce(new Error("fail2"));

    const messages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "x" }] },
    ];

    const res = await runOrchestrator({
      gameSystem: "SYS",
      messages,
      conversationId: "c1",
    });
    expect(res.preSteps).toEqual([]);
    expect(res.suggestedTwists).toEqual([]);
    expect(res.reasoning).toContain("orchestrator failed");
  });
});
