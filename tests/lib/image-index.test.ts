import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchImages } from "@/lib/image-index";

const GAME_ID = "test-game-id";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    image: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockImages = [
  {
    id: "1",
    gameId: GAME_ID,
    slug: "tahir-portrait",
    file: "tahir-portrait.jpeg",
    prompt: "A skilled craftsman in his workshop",
    tags: JSON.stringify(["tahir", "portrait", "character"]),
    referencedIn: "NPCs/Tahir.md",
    createdAt: new Date(),
  },
  {
    id: "2",
    gameId: GAME_ID,
    slug: "bazaar-morning",
    file: "bazaar-morning.jpeg",
    prompt: "A bustling market at sunrise",
    tags: JSON.stringify(["bazaar", "location", "exterior"]),
    referencedIn: "Locations/Bazaar.md",
    createdAt: new Date(),
  },
];

describe("searchImages", () => {
  beforeEach(() => {
    vi.mocked(prisma.image.findMany).mockResolvedValue(mockImages);
  });

  it("finds image by slug", async () => {
    const result = await searchImages(GAME_ID, "tahir");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("tahir-portrait");
  });

  it("finds image by tag", async () => {
    const result = await searchImages(GAME_ID, "location");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("bazaar-morning");
  });

  it("finds image by prompt word", async () => {
    const result = await searchImages(GAME_ID, "craftsman");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("tahir-portrait");
  });

  it("matches all words in query", async () => {
    const result = await searchImages(GAME_ID, "tahir portrait");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("tahir-portrait");
  });

  it("returns null when no match", async () => {
    const result = await searchImages(GAME_ID, "nonexistent");
    expect(result).toBeNull();
  });

  it("is case insensitive", async () => {
    const result = await searchImages(GAME_ID, "TAHIR");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("tahir-portrait");
  });
});
