import { describe, it, expect, vi, beforeEach } from "vitest";

const GAME_ID = "test-game-id";
const USER_ID = "test-user-id";

describe("getCurrentGame", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns existing game for user", async () => {
    const mockGame = { id: GAME_ID, filesDir: "/some/path" };

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        game: {
          findFirst: vi.fn().mockResolvedValue(mockGame),
          create: vi.fn(),
        },
      },
    }));

    const { getCurrentGame } = await import("@/lib/game-files");
    const game = await getCurrentGame(USER_ID);

    expect(game).toEqual(mockGame);
  });

  it("throws when no game exists for user", async () => {
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        game: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    }));

    const { getCurrentGame } = await import("@/lib/game-files");
    await expect(getCurrentGame(USER_ID)).rejects.toThrow(
      "No game found. Please complete onboarding first.",
    );
  });
});

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
