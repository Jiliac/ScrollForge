import { describe, it, expect, vi, beforeEach } from "vitest";

const GAME_ID = "test-game-id";

describe("loadGameContext", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("builds context from game files in the database", async () => {
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        gameFile: {
          findMany: vi.fn().mockResolvedValue([
            { path: "story.md", content: "Story content", gameId: GAME_ID },
            { path: "world.md", content: "World content", gameId: GAME_ID },
          ]),
        },
      },
    }));

    const { loadGameContext } = await import("@/lib/game-files");
    const context = await loadGameContext(GAME_ID);

    expect(context).toContain("## story.md");
    expect(context).toContain("Story content");
    expect(context).toContain("## world.md");
    expect(context).toContain("World content");
  });

  it("skips config files", async () => {
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        gameFile: {
          findMany: vi.fn().mockResolvedValue([
            {
              path: "config.yaml",
              content: "config content",
              gameId: GAME_ID,
            },
            {
              path: "style-guide.md",
              content: "style content",
              gameId: GAME_ID,
            },
            { path: "story.md", content: "story content", gameId: GAME_ID },
          ]),
        },
      },
    }));

    const { loadGameContext } = await import("@/lib/game-files");
    const context = await loadGameContext(GAME_ID);

    expect(context).not.toContain("config.yaml");
    expect(context).not.toContain("style-guide.md");
    expect(context).toContain("story.md");
  });

  it("propagates database errors", async () => {
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        gameFile: {
          findMany: vi.fn().mockRejectedValue(new Error("DB connection lost")),
        },
      },
    }));

    const { loadGameContext } = await import("@/lib/game-files");
    await expect(loadGameContext(GAME_ID)).rejects.toThrow(
      "DB connection lost",
    );
  });
});
