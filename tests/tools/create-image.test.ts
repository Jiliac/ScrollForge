import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeCreateImage } from "@/app/api/chat/tools/create-image";

const GAME_ID = "test-game-id";

vi.mock("fs", () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: vi.fn(),
  },
}));

vi.mock("@/lib/normalize-path", () => ({
  normalizeGameFilePath: (p: string) => p,
}));

import { prisma } from "@/lib/prisma";

describe("makeCreateImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves image, inserts DB record, and updates markdown reference file", async () => {
    const fs = await import("fs");
    const { generateImageWithBfl } = await import("@/lib/bfl-api");
    const { createImage } = await import("@/lib/image-index");

    vi.mocked(generateImageWithBfl).mockResolvedValueOnce(Buffer.from("img"));
    vi.mocked(prisma.$executeRaw).mockResolvedValueOnce(1);

    const tool = makeCreateImage(GAME_ID);
    const res = await tool.execute!(
      {
        slug: "tahir-portrait",
        prompt: "style base ...",
        tags: ["tahir"],
        reference_file: "NPCs/Tahir.md",
        reference_slugs: ["tahir-portrait-old"],
      },
      { messages: [], toolCallId: "test" },
    );

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

    expect(createImage).toHaveBeenCalledWith(GAME_ID, {
      slug: "tahir-portrait",
      file: "tahir-portrait.jpeg",
      prompt: "style base ...",
      tags: ["tahir"],
      referencedIn: "NPCs/Tahir.md",
    });

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);

    expect(res).toEqual({
      success: true,
      path: "images/tahir-portrait.jpeg",
      slug: "tahir-portrait",
    });
  });

  it("uses atomic upsert for reference file", async () => {
    const { generateImageWithBfl } = await import("@/lib/bfl-api");

    vi.mocked(generateImageWithBfl).mockResolvedValueOnce(Buffer.from("img"));
    vi.mocked(prisma.$executeRaw).mockResolvedValueOnce(1);

    const tool = makeCreateImage(GAME_ID);
    await tool.execute!(
      {
        slug: "bazaar-morning",
        prompt: "style base ...",
        tags: ["bazaar"],
        reference_file: "Locations/Bazaar.md",
      },
      { messages: [], toolCallId: "test" },
    );

    // Verify atomic upsert was used (not separate findUnique + create/update)
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
