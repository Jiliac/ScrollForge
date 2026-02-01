import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createConversation,
  ensureConversationExists,
  loadConversation,
} from "@/lib/conversations";

const GAME_ID = "test-game-id";
const USER_ID = "test-user-id";

const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createConversation", () => {
  it("creates with provided userId and gameId", async () => {
    mockPrisma.conversation.create.mockResolvedValue({
      id: "auto-id",
    } as never);

    const result = await createConversation(USER_ID, GAME_ID);
    expect(result).toBe("auto-id");
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
      data: { gameId: GAME_ID, userId: USER_ID },
    });
  });

  it("creates with explicit id when provided", async () => {
    mockPrisma.conversation.create.mockResolvedValue({
      id: "custom-id",
    } as never);

    const result = await createConversation(USER_ID, GAME_ID, "custom-id");
    expect(result).toBe("custom-id");
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
      data: { id: "custom-id", gameId: GAME_ID, userId: USER_ID },
    });
  });
});

describe("ensureConversationExists", () => {
  it("no-ops when conversation exists for this user", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: "conv-1",
    } as never);

    await ensureConversationExists("conv-1", USER_ID, GAME_ID);
    expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith({
      where: { id: "conv-1", gameId: GAME_ID, userId: USER_ID },
    });
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
  });

  it("creates new conversation when not found", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await ensureConversationExists("conv-2", USER_ID, GAME_ID);
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
      data: { id: "conv-2", gameId: GAME_ID, userId: USER_ID },
    });
  });

  it("filters by userId in the where clause", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await ensureConversationExists("conv-1", "user-other", GAME_ID);
    expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-other" }),
      }),
    );
  });
});

describe("loadConversation", () => {
  it("returns conversation with parsed messages when found", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: "conv-1",
      messages: [
        {
          id: "msg-1",
          role: "user",
          parts: JSON.stringify([{ type: "text", text: "hello" }]),
          createdAt: new Date(),
        },
      ],
    } as never);

    const result = await loadConversation("conv-1", USER_ID);
    expect(result).toEqual({
      id: "conv-1",
      messages: [
        {
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "hello" }],
        },
      ],
    });
  });

  it("returns null when not found", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    const result = await loadConversation("conv-x", USER_ID);
    expect(result).toBeNull();
  });

  it("filters by userId in the where clause", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await loadConversation("conv-1", USER_ID);
    expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID }),
      }),
    );
  });
});
