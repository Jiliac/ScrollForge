import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";

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

describe("readMdFilesRecursively", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reads markdown files recursively", async () => {
    vi.doMock("fs", () => ({
      promises: {
        readdir: vi.fn().mockImplementation((dir: string) => {
          if (dir === "/test") {
            return Promise.resolve([
              {
                name: "file1.md",
                isDirectory: () => false,
                isFile: () => true,
              },
              { name: "subdir", isDirectory: () => true, isFile: () => false },
            ]);
          }
          if (dir === "/test/subdir") {
            return Promise.resolve([
              {
                name: "file2.md",
                isDirectory: () => false,
                isFile: () => true,
              },
            ]);
          }
          return Promise.resolve([]);
        }),
        readFile: vi.fn().mockImplementation((filePath: string) => {
          if (filePath === "/test/file1.md") return Promise.resolve("content1");
          if (filePath === "/test/subdir/file2.md")
            return Promise.resolve("content2");
          return Promise.resolve("");
        }),
      },
    }));

    const { readMdFilesRecursively } = await import("@/lib/game-files");
    const files = await readMdFilesRecursively("/test", "/test");

    expect(files).toHaveLength(2);
    expect(files).toContainEqual({
      relativePath: "file1.md",
      content: "content1",
    });
    expect(files).toContainEqual({
      relativePath: "subdir/file2.md",
      content: "content2",
    });
  });

  it("ignores videos and images directories", async () => {
    vi.doMock("fs", () => ({
      promises: {
        readdir: vi.fn().mockResolvedValue([
          { name: "images", isDirectory: () => true, isFile: () => false },
          { name: "videos", isDirectory: () => true, isFile: () => false },
          { name: "file.md", isDirectory: () => false, isFile: () => true },
        ]),
        readFile: vi.fn().mockResolvedValue("content"),
      },
    }));

    const { readMdFilesRecursively } = await import("@/lib/game-files");
    const files = await readMdFilesRecursively("/test", "/test");

    expect(files).toHaveLength(1);
    expect(files[0].relativePath).toBe("file.md");
  });
});

describe("loadGameContext", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.GAME_FILES_DIR = "/test-game";
  });

  it("builds context from markdown files", async () => {
    vi.doMock("fs", () => ({
      promises: {
        readdir: vi.fn().mockResolvedValue([
          { name: "story.md", isDirectory: () => false, isFile: () => true },
          { name: "world.md", isDirectory: () => false, isFile: () => true },
        ]),
        readFile: vi.fn().mockImplementation((filePath: string) => {
          if (filePath.endsWith("story.md"))
            return Promise.resolve("Story content");
          if (filePath.endsWith("world.md"))
            return Promise.resolve("World content");
          return Promise.resolve("");
        }),
      },
    }));

    // Mock prisma to avoid DB calls
    vi.doMock("@/lib/prisma", () => ({
      prisma: { game: { upsert: vi.fn() } },
    }));

    const { loadGameContext } = await import("@/lib/game-files");
    const context = await loadGameContext();

    expect(context).toContain("## story.md");
    expect(context).toContain("Story content");
    expect(context).toContain("## world.md");
    expect(context).toContain("World content");
  });

  it("skips config files", async () => {
    vi.doMock("fs", () => ({
      promises: {
        readdir: vi.fn().mockResolvedValue([
          { name: "config.yaml", isDirectory: () => false, isFile: () => true },
          {
            name: "style-guide.md",
            isDirectory: () => false,
            isFile: () => true,
          },
          { name: "story.md", isDirectory: () => false, isFile: () => true },
        ]),
        readFile: vi.fn().mockResolvedValue("content"),
      },
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: { game: { upsert: vi.fn() } },
    }));

    const { loadGameContext } = await import("@/lib/game-files");
    const context = await loadGameContext();

    expect(context).not.toContain("config.yaml");
    expect(context).not.toContain("style-guide.md");
    expect(context).toContain("story.md");
  });
});
