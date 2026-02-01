import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchImages,
  createImage,
  getImageBySlug,
  getAllImages,
} from "@/lib/image-index";

const GAME_ID = "test-game-id";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    image: {
      create: vi.fn(),
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

describe("createImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an image record with serialized tags", async () => {
    vi.mocked(prisma.image.create).mockResolvedValue(mockImage);

    const entry = {
      slug: "tahir-portrait",
      file: "tahir-portrait.jpeg",
      prompt: "A skilled craftsman in his workshop",
      tags: ["tahir", "portrait", "character"],
      referencedIn: "NPCs/Tahir.md",
    };

    const result = await createImage(GAME_ID, entry);

    expect(result).toEqual(mockImage);
    expect(prisma.image.create).toHaveBeenCalledWith({
      data: {
        gameId: GAME_ID,
        slug: "tahir-portrait",
        file: "tahir-portrait.jpeg",
        prompt: "A skilled craftsman in his workshop",
        tags: JSON.stringify(["tahir", "portrait", "character"]),
        referencedIn: "NPCs/Tahir.md",
      },
    });
  });
});

describe("getImageBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed entry when image exists", async () => {
    vi.mocked(prisma.image.findFirst).mockResolvedValue(mockImage);

    const result = await getImageBySlug(GAME_ID, "tahir-portrait");

    expect(result).toEqual({
      slug: "tahir-portrait",
      file: "tahir-portrait.jpeg",
      prompt: "A skilled craftsman in his workshop",
      tags: ["tahir", "portrait", "character"],
      referencedIn: "NPCs/Tahir.md",
    });
    expect(prisma.image.findFirst).toHaveBeenCalledWith({
      where: { gameId: GAME_ID, slug: "tahir-portrait" },
    });
  });

  it("returns null when image does not exist", async () => {
    vi.mocked(prisma.image.findFirst).mockResolvedValue(null);

    const result = await getImageBySlug(GAME_ID, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("getAllImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all images with parsed tags", async () => {
    const secondImage = {
      ...mockImage,
      id: "2",
      slug: "bazaar-morning",
      file: "bazaar-morning.jpeg",
      tags: JSON.stringify(["bazaar", "location"]),
    };
    vi.mocked(prisma.image.findMany).mockResolvedValue([
      mockImage,
      secondImage,
    ]);

    const result = await getAllImages(GAME_ID);

    expect(result).toHaveLength(2);
    expect(result[0].tags).toEqual(["tahir", "portrait", "character"]);
    expect(result[1].tags).toEqual(["bazaar", "location"]);
    expect(prisma.image.findMany).toHaveBeenCalledWith({
      where: { gameId: GAME_ID },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns empty array when no images exist", async () => {
    vi.mocked(prisma.image.findMany).mockResolvedValue([]);

    const result = await getAllImages(GAME_ID);
    expect(result).toEqual([]);
  });
});
