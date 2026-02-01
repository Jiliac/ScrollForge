import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/image-index", () => ({
  searchImages: vi.fn(),
}));

import { createAskTools } from "@/app/api/chat/tools";

const GAME_ID = "test-game-id";

describe("createAskTools", () => {
  it("throws on empty gameId", () => {
    expect(() => createAskTools("")).toThrow(
      "createTools requires a valid gameId",
    );
  });

  it("returns only search_image", () => {
    const tools = createAskTools(GAME_ID);
    expect(Object.keys(tools)).toEqual(["search_image"]);
  });

  it("search_image has execute and parameters", () => {
    const tools = createAskTools(GAME_ID);
    expect(typeof tools.search_image.execute).toBe("function");
    expect(tools.search_image.inputSchema).toBeDefined();
  });
});
