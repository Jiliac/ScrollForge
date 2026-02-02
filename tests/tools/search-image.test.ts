import { describe, it, expect, vi } from "vitest";
import { makeSearchImage } from "@/app/api/chat/tools/search-image";

const GAME_ID = "test-game-id";

vi.mock("@/lib/image-index", () => ({
  searchImages: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  getImageUrl: vi.fn(),
}));

describe("makeSearchImage", () => {
  it("returns error when not found", async () => {
    const { searchImages } = await import("@/lib/image-index");
    vi.mocked(searchImages).mockResolvedValueOnce(null);

    const tool = makeSearchImage(GAME_ID);
    const res = await tool.execute!(
      { query: "tahir" },
      { messages: [], toolCallId: "test" },
    );
    expect((res as Record<string, unknown>).success).toBe(false);
  });

  it("returns URL when found", async () => {
    const { searchImages } = await import("@/lib/image-index");
    const { getImageUrl } = await import("@/lib/storage");
    vi.mocked(searchImages).mockResolvedValueOnce({
      slug: "tahir-portrait",
      file: "games/test-game-id/images/tahir-portrait.jpeg",
      prompt: "x",
      tags: ["tahir"],
      referencedIn: "NPCs/Tahir.md",
    });
    vi.mocked(getImageUrl).mockReturnValueOnce(
      "https://xyz.supabase.co/storage/v1/object/public/game-images/games/test-game-id/images/tahir-portrait.jpeg",
    );

    const tool = makeSearchImage(GAME_ID);
    const res = await tool.execute!(
      { query: "tahir" },
      { messages: [], toolCallId: "test" },
    );
    expect(res).toEqual({
      success: true,
      url: "https://xyz.supabase.co/storage/v1/object/public/game-images/games/test-game-id/images/tahir-portrait.jpeg",
      slug: "tahir-portrait",
      prompt: "x",
      tags: ["tahir"],
    });
  });
});
