import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchImages } from "@/lib/image-index";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    image: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/game-files", () => ({
  getCurrentGameId: vi.fn().mockResolvedValue("test-game-id"),
}));

import { prisma } from "@/lib/prisma";

const mockImages = [
  {
    id: "1",
    gameId: "test-game-id",
    slug: "tahir-portrait",
    file: "tahir-portrait.jpeg",
    prompt: "A skilled craftsman in his workshop",
    tags: JSON.stringify(["tahir", "portrait", "character"]),
    referencedIn: "NPCs/Tahir.md",
    createdAt: new Date(),
  },
  {
    id: "2",
    gameId: "test-game-id",
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
    const result = await searchImages("tahir");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("tahir-portrait");
  });

  it("finds image by tag", async () => {
    const result = await searchImages("location");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("bazaar-morning");
  });

  it("finds image by prompt word", async () => {
    const result = await searchImages("craftsman");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("tahir-portrait");
  });

  it("matches all words in query", async () => {
    const result = await searchImages("tahir portrait");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("tahir-portrait");
  });

  it("returns null when no match", async () => {
    const result = await searchImages("nonexistent");
    expect(result).toBeNull();
  });

  it("is case insensitive", async () => {
    const result = await searchImages("TAHIR");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("tahir-portrait");
  });
});
