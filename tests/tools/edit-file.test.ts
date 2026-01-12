import { describe, it, expect, vi, beforeEach } from "vitest";
import { editFileTool } from "@/app/api/chat/tools/edit-file";

vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock("@/lib/game-files", () => ({
  getGameFilesDir: () => "/tmp/game",
}));

describe("editFileTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails if old_string not found", async () => {
    const fs = await import("fs");
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce("hello");

    const res = await editFileTool.execute({
      file_path: "factions.md",
      old_string: "MISSING",
      new_string: "X",
    });

    expect(res).toEqual({
      success: false,
      error: "old_string not found in file",
    });
    expect(fs.promises.writeFile).not.toHaveBeenCalled();
  });

  it("fails if old_string appears more than once", async () => {
    const fs = await import("fs");
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce("A A");

    const res = await editFileTool.execute({
      file_path: "factions.md",
      old_string: "A",
      new_string: "B",
    });

    expect(res.success).toBe(false);
    expect(String((res as { error?: string }).error)).toContain(
      "appears 2 times",
    );
    expect(fs.promises.writeFile).not.toHaveBeenCalled();
  });

  it("replaces unique old_string and writes file", async () => {
    const fs = await import("fs");
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce("hello world");

    const res = await editFileTool.execute({
      file_path: "State.md",
      old_string: "world",
      new_string: "there",
    });

    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      "/tmp/game/State.md",
      "hello there",
      "utf-8",
    );
    expect(res).toEqual({ success: true, path: "State.md" });
  });
});
