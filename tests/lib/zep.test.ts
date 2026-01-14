import { describe, it, expect, vi, afterEach } from "vitest";

function createMockZepClient(overrides = {}) {
  return class MockZepClient {
    user = { get: vi.fn(), add: vi.fn() };
    graph = { addBatch: vi.fn() };
    constructor() {
      Object.assign(this, overrides);
    }
  };
}

function clearZepGlobal() {
  const g = globalThis as unknown as { zep: unknown };
  delete g.zep;
}

describe("isZepEnabled", () => {
  const originalEnv = process.env.ZEP_API_KEY;

  afterEach(() => {
    clearZepGlobal();
    vi.resetModules();
    if (originalEnv) {
      process.env.ZEP_API_KEY = originalEnv;
    } else {
      delete process.env.ZEP_API_KEY;
    }
  });

  it("returns false when ZEP_API_KEY is not set", async () => {
    delete process.env.ZEP_API_KEY;
    vi.doMock("@getzep/zep-cloud", () => ({
      ZepClient: createMockZepClient(),
    }));

    const { isZepEnabled } = await import("@/lib/zep");
    expect(isZepEnabled()).toBe(false);
  });

  it("returns true when ZEP_API_KEY is set", async () => {
    process.env.ZEP_API_KEY = "test-api-key";
    vi.doMock("@getzep/zep-cloud", () => ({
      ZepClient: createMockZepClient(),
    }));

    const { isZepEnabled } = await import("@/lib/zep");
    expect(isZepEnabled()).toBe(true);
  });
});

describe("ensureZepUser", () => {
  const originalEnv = process.env.ZEP_API_KEY;

  afterEach(() => {
    clearZepGlobal();
    vi.resetModules();
    if (originalEnv) {
      process.env.ZEP_API_KEY = originalEnv;
    } else {
      delete process.env.ZEP_API_KEY;
    }
  });

  it("does nothing when zep is disabled", async () => {
    delete process.env.ZEP_API_KEY;
    vi.doMock("@getzep/zep-cloud", () => ({
      ZepClient: createMockZepClient(),
    }));

    const { ensureZepUser } = await import("@/lib/zep");
    await expect(ensureZepUser("game-123")).resolves.toBeUndefined();
  });

  it("does not create user if already exists", async () => {
    process.env.ZEP_API_KEY = "test-api-key";
    const mockGet = vi.fn().mockResolvedValue({ userId: "game-123" });
    const mockAdd = vi.fn();

    vi.doMock("@getzep/zep-cloud", () => ({
      ZepClient: createMockZepClient({
        user: { get: mockGet, add: mockAdd },
      }),
    }));

    const { ensureZepUser } = await import("@/lib/zep");
    await ensureZepUser("game-123");

    expect(mockGet).toHaveBeenCalledWith("game-123");
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("creates user if not exists", async () => {
    process.env.ZEP_API_KEY = "test-api-key";
    const mockGet = vi.fn().mockRejectedValue(new Error("Not found"));
    const mockAdd = vi.fn().mockResolvedValue({});

    vi.doMock("@getzep/zep-cloud", () => ({
      ZepClient: createMockZepClient({
        user: { get: mockGet, add: mockAdd },
      }),
    }));

    const { ensureZepUser } = await import("@/lib/zep");
    await ensureZepUser("game-123");

    expect(mockGet).toHaveBeenCalledWith("game-123");
    expect(mockAdd).toHaveBeenCalledWith({
      userId: "game-123",
      firstName: "Game",
      lastName: "game-123",
    });
  });
});

describe("syncGameFilesToZep", () => {
  const originalEnv = process.env.ZEP_API_KEY;

  afterEach(() => {
    clearZepGlobal();
    vi.resetModules();
    if (originalEnv) {
      process.env.ZEP_API_KEY = originalEnv;
    } else {
      delete process.env.ZEP_API_KEY;
    }
  });

  it("does nothing when zep is disabled", async () => {
    delete process.env.ZEP_API_KEY;
    vi.doMock("@getzep/zep-cloud", () => ({
      ZepClient: createMockZepClient(),
    }));

    const { syncGameFilesToZep } = await import("@/lib/zep");
    await expect(
      syncGameFilesToZep("game-123", [
        { relativePath: "test.md", content: "content" },
      ]),
    ).resolves.toBeUndefined();
  });

  it("sends files as batch episodes", async () => {
    process.env.ZEP_API_KEY = "test-api-key";
    const mockAddBatch = vi.fn().mockResolvedValue({});

    vi.doMock("@getzep/zep-cloud", () => ({
      ZepClient: createMockZepClient({
        graph: { addBatch: mockAddBatch },
      }),
    }));

    const { syncGameFilesToZep } = await import("@/lib/zep");
    await syncGameFilesToZep("game-123", [
      { relativePath: "file1.md", content: "content1" },
      { relativePath: "file2.md", content: "content2" },
    ]);

    expect(mockAddBatch).toHaveBeenCalledTimes(1);
    expect(mockAddBatch).toHaveBeenCalledWith({
      userId: "game-123",
      episodes: [
        { data: "# file1.md\n\ncontent1", type: "text" },
        { data: "# file2.md\n\ncontent2", type: "text" },
      ],
    });
  });

  it("chunks large files under 9500 chars", async () => {
    process.env.ZEP_API_KEY = "test-api-key";
    const mockAddBatch = vi.fn().mockResolvedValue({});

    vi.doMock("@getzep/zep-cloud", () => ({
      ZepClient: createMockZepClient({
        graph: { addBatch: mockAddBatch },
      }),
    }));

    const { syncGameFilesToZep } = await import("@/lib/zep");
    const largeContent = "x".repeat(15000);
    await syncGameFilesToZep("game-123", [
      { relativePath: "large.md", content: largeContent },
    ]);

    expect(mockAddBatch).toHaveBeenCalledTimes(1);
    const call = mockAddBatch.mock.calls[0][0];
    expect(call.episodes.length).toBe(2); // Split into 2 chunks
  });

  it("sends multiple batches for many files", async () => {
    process.env.ZEP_API_KEY = "test-api-key";
    const mockAddBatch = vi.fn().mockResolvedValue({});

    vi.doMock("@getzep/zep-cloud", () => ({
      ZepClient: createMockZepClient({
        graph: { addBatch: mockAddBatch },
      }),
    }));

    const { syncGameFilesToZep } = await import("@/lib/zep");
    const files = Array.from({ length: 25 }, (_, i) => ({
      relativePath: `file${i}.md`,
      content: `content${i}`,
    }));
    await syncGameFilesToZep("game-123", files);

    expect(mockAddBatch).toHaveBeenCalledTimes(2); // 20 + 5
  });
});
