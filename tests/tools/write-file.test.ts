import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFileTool } from "@/app/api/chat/tools/write-file";

vi.mock("fs", () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock("@/lib/game-files", () => ({
  getGameFilesDir: () => "/tmp/game",
}));

describe("writeFileTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes under GAME_FILES_DIR and creates parent folders", async () => {
    const fs = await import("fs");

    const res = await writeFileTool.execute({
      file_path: "NPCs/Tahir.md",
      content: "# Tahir",
    });

    expect(fs.promises.mkdir).toHaveBeenCalledWith("/tmp/game/NPCs", {
      recursive: true,
    });
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      "/tmp/game/NPCs/Tahir.md",
      "# Tahir",
      "utf-8",
    );
    expect(res).toEqual({ success: true, path: "NPCs/Tahir.md" });
  });
});
