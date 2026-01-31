import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/game-files", () => ({
  getCurrentGameId: vi.fn().mockResolvedValue("game-1"),
}));

import { prisma } from "@/lib/prisma";
import {
  createConversation,
  ensureConversationExists,
  loadConversation,
} from "@/lib/conversations";

const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createConversation", () => {
  it("creates with provided userId and gameId", async () => {
    mockPrisma.conversation.create.mockResolvedValue({
      id: "auto-id",
    } as never);

    const result = await createConversation("user-1");
    expect(result).toBe("auto-id");
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
      data: { gameId: "game-1", userId: "user-1" },
    });
  });

  it("creates with explicit id when provided", async () => {
    mockPrisma.conversation.create.mockResolvedValue({
      id: "custom-id",
    } as never);

    const result = await createConversation("user-1", "custom-id");
    expect(result).toBe("custom-id");
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
      data: { id: "custom-id", gameId: "game-1", userId: "user-1" },
    });
  });
});

describe("ensureConversationExists", () => {
  it("no-ops when conversation exists for this user", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: "conv-1",
    } as never);

    await ensureConversationExists("conv-1", "user-1");
    expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith({
      where: { id: "conv-1", gameId: "game-1", userId: "user-1" },
    });
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
  });

  it("creates new conversation when not found", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await ensureConversationExists("conv-2", "user-1");
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
      data: { id: "conv-2", gameId: "game-1", userId: "user-1" },
    });
  });

  it("filters by userId in the where clause", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await ensureConversationExists("conv-1", "user-other");
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

    const result = await loadConversation("conv-1", "user-1");
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

    const result = await loadConversation("conv-x", "user-1");
    expect(result).toBeNull();
  });

  it("filters by userId in the where clause", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await loadConversation("conv-1", "user-1");
    expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      }),
    );
  });
});
