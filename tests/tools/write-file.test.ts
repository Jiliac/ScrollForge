import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeWriteFile } from "@/app/api/chat/tools/write-file";

const GAME_ID = "test-game-id";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gameFile: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/normalize-path", () => ({
  normalizeGameFilePath: (p: string) => p,
}));

import { prisma } from "@/lib/prisma";

describe("makeWriteFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts a game file in the database", async () => {
    vi.mocked(prisma.gameFile.upsert).mockResolvedValueOnce({} as never);

    const tool = makeWriteFile(GAME_ID);
    const res = await tool.execute!(
      {
        file_path: "NPCs/Tahir.md",
        content: "# Tahir",
      },
      { messages: [], toolCallId: "test" },
    );

    expect(prisma.gameFile.upsert).toHaveBeenCalledWith({
      where: { gameId_path: { gameId: GAME_ID, path: "NPCs/Tahir.md" } },
      create: { gameId: GAME_ID, path: "NPCs/Tahir.md", content: "# Tahir" },
      update: { content: "# Tahir" },
    });
    expect(res).toEqual({ success: true, path: "NPCs/Tahir.md" });
  });
});
