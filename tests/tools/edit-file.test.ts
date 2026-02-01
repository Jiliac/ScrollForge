import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeEditFile } from "@/app/api/chat/tools/edit-file";

const GAME_ID = "test-game-id";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gameFile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/normalize-path", () => ({
  normalizeGameFilePath: (p: string) => p,
}));

import { prisma } from "@/lib/prisma";

describe("makeEditFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails if file not found", async () => {
    vi.mocked(prisma.gameFile.findUnique).mockResolvedValueOnce(null);

    const tool = makeEditFile(GAME_ID);
    const res = await tool.execute!(
      {
        file_path: "factions.md",
        old_string: "MISSING",
        new_string: "X",
      },
      { messages: [], toolCallId: "test" },
    );

    expect(res).toEqual({
      success: false,
      error: "File not found",
    });
    expect(prisma.gameFile.update).not.toHaveBeenCalled();
  });

  it("fails if old_string not found", async () => {
    vi.mocked(prisma.gameFile.findUnique).mockResolvedValueOnce({
      content: "hello",
    } as never);

    const tool = makeEditFile(GAME_ID);
    const res = await tool.execute!(
      {
        file_path: "factions.md",
        old_string: "MISSING",
        new_string: "X",
      },
      { messages: [], toolCallId: "test" },
    );

    expect(res).toEqual({
      success: false,
      error: "old_string not found in file",
    });
    expect(prisma.gameFile.update).not.toHaveBeenCalled();
  });

  it("fails if old_string appears more than once", async () => {
    vi.mocked(prisma.gameFile.findUnique).mockResolvedValueOnce({
      content: "A A",
    } as never);

    const tool = makeEditFile(GAME_ID);
    const res = await tool.execute!(
      {
        file_path: "factions.md",
        old_string: "A",
        new_string: "B",
      },
      { messages: [], toolCallId: "test" },
    );

    expect((res as Record<string, unknown>).success).toBe(false);
    expect(String((res as { error?: string }).error)).toContain(
      "appears 2 times",
    );
    expect(prisma.gameFile.update).not.toHaveBeenCalled();
  });

  it("replaces unique old_string and updates file in DB", async () => {
    vi.mocked(prisma.gameFile.findUnique).mockResolvedValueOnce({
      content: "hello world",
    } as never);
    vi.mocked(prisma.gameFile.update).mockResolvedValueOnce({} as never);

    const tool = makeEditFile(GAME_ID);
    const res = await tool.execute!(
      {
        file_path: "State.md",
        old_string: "world",
        new_string: "there",
      },
      { messages: [], toolCallId: "test" },
    );

    expect(prisma.gameFile.update).toHaveBeenCalledWith({
      where: { gameId_path: { gameId: GAME_ID, path: "State.md" } },
      data: { content: "hello there" },
    });
    expect(res).toEqual({ success: true, path: "State.md" });
  });
});
