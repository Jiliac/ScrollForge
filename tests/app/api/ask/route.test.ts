import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockToUIMessageStreamResponse, GAME_ID, USER_ID, CONV_ID } = vi.hoisted(
  () => ({
    mockToUIMessageStreamResponse: vi.fn().mockReturnValue(new Response("ok")),
    GAME_ID: "test-game-id",
    USER_ID: "test-user-id",
    CONV_ID: "test-conv-id",
  }),
);

vi.mock("ai", () => ({
  streamText: vi.fn().mockReturnValue({
    toUIMessageStreamResponse: mockToUIMessageStreamResponse,
  }),
  convertToModelMessages: vi.fn().mockResolvedValue([]),
  stepCountIs: vi.fn().mockReturnValue({ type: "step-count" }),
}));

vi.mock("@/lib/ai-model", () => ({
  defaultModel: "mock-model",
}));

vi.mock("@/lib/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue(USER_ID),
}));

vi.mock("@/lib/game-files", () => ({
  getCurrentGame: vi.fn().mockResolvedValue({ id: GAME_ID }),
  loadGameContext: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/game-config", () => ({
  loadGameConfig: vi.fn().mockResolvedValue({
    setting: { name: "Test", era: "Now" },
    player: { name: "Hero", role: "fighter" },
    tone: { style_inspiration: "X", keywords: ["k"] },
    world: {
      institutions: ["Guild"],
      location_types: ["city"],
      atmosphere: "dark",
    },
    examples: { npc_warning: "w", player_action: "a" },
  }),
}));

vi.mock("@/lib/conversations", () => ({
  ensureConversationExists: vi.fn(),
}));

vi.mock("@/app/api/chat/tools", () => ({
  createAskTools: vi.fn().mockReturnValue({ search_image: {} }),
}));

vi.mock("@/agents/prompts", () => ({
  getAskSystemPrompt: vi.fn().mockReturnValue("ask-system-prompt"),
}));

import { POST } from "@/app/api/ask/route";
import { streamText, convertToModelMessages } from "ai";
import { loadGameContext } from "@/lib/game-files";
import { createAskTools } from "@/app/api/chat/tools";
import { getAskSystemPrompt } from "@/agents/prompts";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validMessage = {
  id: "msg-1",
  role: "user",
  parts: [{ type: "text", text: "Who is the blacksmith?" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadGameContext).mockResolvedValue(null);
  mockToUIMessageStreamResponse.mockReturnValue(new Response("ok"));
});

describe("POST /api/ask", () => {
  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost:3000/api/ask", {
      method: "POST",
      body: "not json{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 400 for missing messages", async () => {
    const res = await POST(makeRequest({ conversationId: CONV_ID }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing conversationId", async () => {
    const res = await POST(makeRequest({ messages: [validMessage] }));
    expect(res.status).toBe(400);
  });

  it("calls streamText with ask tools and ask prompt", async () => {
    await POST(
      makeRequest({
        conversationId: CONV_ID,
        messages: [validMessage],
      }),
    );

    expect(createAskTools).toHaveBeenCalledWith(GAME_ID);
    expect(getAskSystemPrompt).toHaveBeenCalled();
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
        system: "ask-system-prompt",
        tools: { search_image: {} },
      }),
    );
  });

  it("prepends game context message when context exists", async () => {
    vi.mocked(loadGameContext).mockResolvedValueOnce("world lore here");

    await POST(
      makeRequest({
        conversationId: CONV_ID,
        messages: [validMessage],
      }),
    );

    expect(convertToModelMessages).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "game-context",
        role: "user",
        parts: [{ type: "text", text: "# Game Context\n\nworld lore here" }],
      }),
      expect.objectContaining(validMessage),
    ]);
  });

  it("does not prepend context when loadGameContext returns null", async () => {
    vi.mocked(loadGameContext).mockResolvedValueOnce(null);

    await POST(
      makeRequest({
        conversationId: CONV_ID,
        messages: [validMessage],
      }),
    );

    expect(convertToModelMessages).toHaveBeenCalledWith([
      expect.objectContaining(validMessage),
    ]);
  });

  it("uses stepCountIs(5)", async () => {
    const { stepCountIs } = await import("ai");

    await POST(
      makeRequest({
        conversationId: CONV_ID,
        messages: [validMessage],
      }),
    );

    expect(stepCountIs).toHaveBeenCalledWith(5);
  });
});
