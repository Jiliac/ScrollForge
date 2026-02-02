import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";
import { extractImagesFromMessages } from "@/lib/conversations";

describe("extractImagesFromMessages", () => {
  it("extracts URLs from new-format tool outputs", () => {
    const messages: UIMessage[] = [
      {
        id: "a",
        role: "assistant",
        parts: [
          {
            type: "tool-create_image",
            toolCallId: "1",
            state: "output-available",
            input: {},
            output: {
              url: "https://xyz.supabase.co/storage/v1/object/public/game-images/games/g1/images/a.jpeg",
            },
          } as unknown as UIMessage["parts"][number],
        ],
      },
      {
        id: "b",
        role: "assistant",
        parts: [
          {
            type: "tool-search_image",
            toolCallId: "2",
            state: "output-available",
            input: {},
            output: {
              url: "https://xyz.supabase.co/storage/v1/object/public/game-images/games/g1/images/b.jpeg",
            },
          } as unknown as UIMessage["parts"][number],
        ],
      },
    ];

    expect(extractImagesFromMessages(messages)).toEqual([
      "https://xyz.supabase.co/storage/v1/object/public/game-images/games/g1/images/a.jpeg",
      "https://xyz.supabase.co/storage/v1/object/public/game-images/games/g1/images/b.jpeg",
    ]);
  });

  it("extracts legacy paths from old-format tool outputs", () => {
    const messages: UIMessage[] = [
      {
        id: "a",
        role: "assistant",
        parts: [
          {
            type: "tool-create_image",
            toolCallId: "1",
            state: "output-available",
            input: {},
            output: { path: "images/a.jpeg" },
          } as unknown as UIMessage["parts"][number],
        ],
      },
    ];

    expect(extractImagesFromMessages(messages)).toEqual(["images/a.jpeg"]);
  });

  it("prefers url over path when both are present", () => {
    const messages: UIMessage[] = [
      {
        id: "a",
        role: "assistant",
        parts: [
          {
            type: "tool-create_image",
            toolCallId: "1",
            state: "output-available",
            input: {},
            output: {
              url: "https://cdn.example.com/img.jpeg",
              path: "images/old.jpeg",
            },
          } as unknown as UIMessage["parts"][number],
        ],
      },
    ];

    expect(extractImagesFromMessages(messages)).toEqual([
      "https://cdn.example.com/img.jpeg",
    ]);
  });

  it("ignores non-image tool outputs", () => {
    const messages: UIMessage[] = [
      {
        id: "c",
        role: "assistant",
        parts: [
          {
            type: "tool-write_file",
            toolCallId: "3",
            state: "output-available",
            input: {},
            output: { path: "NPCs/X.md" },
          } as unknown as UIMessage["parts"][number],
        ],
      },
    ];

    expect(extractImagesFromMessages(messages)).toEqual([]);
  });

  it("ignores tool outputs without url or path", () => {
    const messages: UIMessage[] = [
      {
        id: "d",
        role: "assistant",
        parts: [
          {
            type: "tool-create_image",
            toolCallId: "4",
            state: "output-available",
            input: {},
            output: { success: false, error: "BFL failed" },
          } as unknown as UIMessage["parts"][number],
        ],
      },
    ];

    expect(extractImagesFromMessages(messages)).toEqual([]);
  });
});
