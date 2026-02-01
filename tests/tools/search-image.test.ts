import { describe, it, expect, vi } from "vitest";
import { makeSearchImage } from "@/app/api/chat/tools/search-image";

const GAME_ID = "test-game-id";

vi.mock("@/lib/image-index", () => ({
  searchImages: vi.fn(),
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

  it("returns path when found", async () => {
    const { searchImages } = await import("@/lib/image-index");
    vi.mocked(searchImages).mockResolvedValueOnce({
      slug: "tahir-portrait",
      file: "tahir-portrait.jpeg",
      prompt: "x",
      tags: ["tahir"],
      referencedIn: "NPCs/Tahir.md",
    });

    const tool = makeSearchImage(GAME_ID);
    const res = await tool.execute!(
      { query: "tahir" },
      { messages: [], toolCallId: "test" },
    );
    expect(res).toEqual({
      success: true,
      path: "images/tahir-portrait.jpeg",
      slug: "tahir-portrait",
      prompt: "x",
      tags: ["tahir"],
    });
  });
});
