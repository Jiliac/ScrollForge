import { describe, it, expect, vi, beforeEach } from "vitest";
import { createImageTool } from "@/app/api/chat/tools/create-image";

vi.mock("fs", () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
}));

vi.mock("@/lib/game-files", () => ({
  getGameFilesDir: () => "/tmp/game",
}));

vi.mock("@/lib/bfl-api", () => ({
  generateImageWithBfl: vi.fn(),
}));

vi.mock("@/lib/image-index", () => ({
  createImage: vi.fn(),
}));

describe("createImageTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves image, inserts DB record, and appends markdown reference", async () => {
    const fs = await import("fs");
    const { generateImageWithBfl } = await import("@/lib/bfl-api");
    const { createImage } = await import("@/lib/image-index");

    vi.mocked(generateImageWithBfl).mockResolvedValueOnce(Buffer.from("img"));
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce("# Tahir\n");

    const res = await createImageTool.execute({
      slug: "tahir-portrait",
      prompt: "style base ...",
      tags: ["tahir"],
      reference_file: "NPCs/Tahir.md",
      reference_slugs: ["tahir-portrait-old"],
    });

    expect(generateImageWithBfl).toHaveBeenCalledWith("style base ...", [
      "tahir-portrait-old",
    ]);

    expect(fs.promises.mkdir).toHaveBeenCalledWith("/tmp/game/images", {
      recursive: true,
    });
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      "/tmp/game/images/tahir-portrait.jpeg",
      expect.any(Buffer),
    );

    expect(createImage).toHaveBeenCalledWith({
      slug: "tahir-portrait",
      file: "tahir-portrait.jpeg",
      prompt: "style base ...",
      tags: ["tahir"],
      referencedIn: "NPCs/Tahir.md",
    });

    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      "/tmp/game/NPCs/Tahir.md",
      "# Tahir\n\n\n![tahir-portrait](images/tahir-portrait.jpeg)\n",
      "utf-8",
    );

    expect(res).toEqual({
      success: true,
      path: "images/tahir-portrait.jpeg",
      slug: "tahir-portrait",
    });
  });

  it("creates reference file if missing", async () => {
    const fs = await import("fs");
    const { generateImageWithBfl } = await import("@/lib/bfl-api");

    vi.mocked(generateImageWithBfl).mockResolvedValueOnce(Buffer.from("img"));
    vi.mocked(fs.promises.readFile).mockRejectedValueOnce(new Error("missing"));

    const res = await createImageTool.execute({
      slug: "bazaar-morning",
      prompt: "style base ...",
      tags: ["bazaar"],
      reference_file: "Locations/Bazaar.md",
    });

    expect(fs.promises.mkdir).toHaveBeenCalledWith("/tmp/game/Locations", {
      recursive: true,
    });
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      "/tmp/game/Locations/Bazaar.md",
      "# bazaar-morning\n\n![bazaar-morning](images/bazaar-morning.jpeg)\n",
      "utf-8",
    );

    expect(res.success).toBe(true);
  });
});
