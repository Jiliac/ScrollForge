import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchImages } from "@/lib/image-index";

const GAME_ID = "test-game-id";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    image: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockImage = {
  id: "1",
  gameId: GAME_ID,
  slug: "tahir-portrait",
  file: "tahir-portrait.jpeg",
  prompt: "A skilled craftsman in his workshop",
  tags: JSON.stringify(["tahir", "portrait", "character"]),
  referencedIn: "NPCs/Tahir.md",
  createdAt: new Date(),
};

describe("searchImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds image by slug", async () => {
    vi.mocked(prisma.image.findFirst).mockResolvedValue(mockImage);

    const result = await searchImages(GAME_ID, "tahir");

    expect(result).not.toBeNull();
    expect(result?.slug).toBe("tahir-portrait");
    expect(prisma.image.findFirst).toHaveBeenCalledWith({
      where: {
        gameId: GAME_ID,
        AND: [
          {
            OR: [
              { slug: { contains: "tahir", mode: "insensitive" } },
              { prompt: { contains: "tahir", mode: "insensitive" } },
              { tags: { contains: "tahir", mode: "insensitive" } },
            ],
          },
        ],
      },
    });
  });

  it("builds AND conditions for multi-word queries", async () => {
    vi.mocked(prisma.image.findFirst).mockResolvedValue(mockImage);

    await searchImages(GAME_ID, "tahir portrait");

    expect(prisma.image.findFirst).toHaveBeenCalledWith({
      where: {
        gameId: GAME_ID,
        AND: [
          {
            OR: [
              { slug: { contains: "tahir", mode: "insensitive" } },
              { prompt: { contains: "tahir", mode: "insensitive" } },
              { tags: { contains: "tahir", mode: "insensitive" } },
            ],
          },
          {
            OR: [
              { slug: { contains: "portrait", mode: "insensitive" } },
              { prompt: { contains: "portrait", mode: "insensitive" } },
              { tags: { contains: "portrait", mode: "insensitive" } },
            ],
          },
        ],
      },
    });
  });

  it("returns null when no match", async () => {
    vi.mocked(prisma.image.findFirst).mockResolvedValue(null);

    const result = await searchImages(GAME_ID, "nonexistent");
    expect(result).toBeNull();
  });

  it("returns null for empty query", async () => {
    const result = await searchImages(GAME_ID, "   ");
    expect(result).toBeNull();
    expect(prisma.image.findFirst).not.toHaveBeenCalled();
  });
});
