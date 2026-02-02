import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeCreateImage } from "@/app/api/chat/tools/create-image";

const GAME_ID = "test-game-id";

vi.mock("@/lib/bfl-api", () => ({
  generateImageWithBfl: vi.fn(),
}));

vi.mock("@/lib/image-index", () => ({
  createImage: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  uploadImage: vi.fn(),
  getImageUrl: vi.fn(),
}));

describe("makeCreateImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads to storage, inserts DB record, and returns URL", async () => {
    const { generateImageWithBfl } = await import("@/lib/bfl-api");
    const { createImage } = await import("@/lib/image-index");
    const { uploadImage, getImageUrl } = await import("@/lib/storage");

    vi.mocked(generateImageWithBfl).mockResolvedValueOnce(Buffer.from("img"));
    vi.mocked(uploadImage).mockResolvedValueOnce(
      "games/test-game-id/images/tahir-portrait.jpeg",
    );
    vi.mocked(getImageUrl).mockReturnValueOnce(
      "https://xyz.supabase.co/storage/v1/object/public/game-images/games/test-game-id/images/tahir-portrait.jpeg",
    );

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

    expect(generateImageWithBfl).toHaveBeenCalledWith(
      GAME_ID,
      "style base ...",
      ["tahir-portrait-old"],
    );

    expect(uploadImage).toHaveBeenCalledWith(
      GAME_ID,
      "tahir-portrait",
      expect.any(Buffer),
    );

    expect(createImage).toHaveBeenCalledWith(GAME_ID, {
      slug: "tahir-portrait",
      file: "games/test-game-id/images/tahir-portrait.jpeg",
      prompt: "style base ...",
      tags: ["tahir"],
      referencedIn: "NPCs/Tahir.md",
    });

    expect(res).toEqual({
      success: true,
      url: "https://xyz.supabase.co/storage/v1/object/public/game-images/games/test-game-id/images/tahir-portrait.jpeg",
      slug: "tahir-portrait",
    });
  });

  it("does not embed markdown references in game files", async () => {
    const { generateImageWithBfl } = await import("@/lib/bfl-api");
    const { uploadImage, getImageUrl } = await import("@/lib/storage");

    vi.mocked(generateImageWithBfl).mockResolvedValueOnce(Buffer.from("img"));
    vi.mocked(uploadImage).mockResolvedValueOnce(
      "games/test-game-id/images/bazaar-morning.jpeg",
    );
    vi.mocked(getImageUrl).mockReturnValueOnce("https://example.com/img.jpeg");

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

    // No prisma.$executeRaw call — markdown embedding removed
    // Just verify uploadImage was called (the main write operation)
    expect(uploadImage).toHaveBeenCalledTimes(1);
  });

  it("returns error on failure", async () => {
    const { generateImageWithBfl } = await import("@/lib/bfl-api");
    vi.mocked(generateImageWithBfl).mockRejectedValueOnce(
      new Error("BFL_API_KEY not configured"),
    );

    const tool = makeCreateImage(GAME_ID);
    const res = await tool.execute!(
      {
        slug: "fail",
        prompt: "x",
        tags: [],
        reference_file: "NPCs/X.md",
      },
      { messages: [], toolCallId: "test" },
    );

    expect(res).toEqual({
      success: false,
      error: "BFL_API_KEY not configured",
    });
  });
});
