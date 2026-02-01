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
    gameFile: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
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
    vi.mocked(prisma.gameFile.findUnique).mockResolvedValueOnce({
      content: "# Tahir\n",
    } as never);
    vi.mocked(prisma.gameFile.update).mockResolvedValueOnce({} as never);

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

    expect(prisma.gameFile.update).toHaveBeenCalledWith({
      where: { gameId_path: { gameId: GAME_ID, path: "NPCs/Tahir.md" } },
      data: {
        content: "# Tahir\n\n\n![tahir-portrait](images/tahir-portrait.jpeg)\n",
      },
    });

    expect(res).toEqual({
      success: true,
      path: "images/tahir-portrait.jpeg",
      slug: "tahir-portrait",
    });
  });

  it("creates reference file in DB if missing", async () => {
    const { generateImageWithBfl } = await import("@/lib/bfl-api");

    vi.mocked(generateImageWithBfl).mockResolvedValueOnce(Buffer.from("img"));
    vi.mocked(prisma.gameFile.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.gameFile.create).mockResolvedValueOnce({} as never);

    const tool = makeCreateImage(GAME_ID);
    const res = await tool.execute!(
      {
        slug: "bazaar-morning",
        prompt: "style base ...",
        tags: ["bazaar"],
        reference_file: "Locations/Bazaar.md",
      },
      { messages: [], toolCallId: "test" },
    );

    expect(prisma.gameFile.create).toHaveBeenCalledWith({
      data: {
        gameId: GAME_ID,
        path: "Locations/Bazaar.md",
        content: "# Bazaar\n\n![bazaar-morning](images/bazaar-morning.jpeg)\n",
      },
    });

    expect((res as Record<string, unknown>).success).toBe(true);
  });
});
