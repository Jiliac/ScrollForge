import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";

const GAME_ID = "test-game-id";

describe("getGameFilesDir", () => {
  const originalEnv = process.env.GAME_FILES_DIR;

  afterEach(() => {
    if (originalEnv) {
      process.env.GAME_FILES_DIR = originalEnv;
    } else {
      delete process.env.GAME_FILES_DIR;
    }
    vi.resetModules();
  });

  it("returns GAME_FILES_DIR env var when set", async () => {
    process.env.GAME_FILES_DIR = "/custom/path";
    const { getGameFilesDir } = await import("@/lib/game-files");
    expect(getGameFilesDir()).toBe("/custom/path");
  });

  it("returns default path when env var not set", async () => {
    delete process.env.GAME_FILES_DIR;
    const { getGameFilesDir } = await import("@/lib/game-files");
    expect(getGameFilesDir()).toBe(
      path.join(process.cwd(), "game_files_local"),
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
});
