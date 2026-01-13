import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";
import { extractImagesFromMessages } from "@/lib/conversations";

describe("extractImagesFromMessages", () => {
  it("extracts image paths from create_image and search_image tool outputs", () => {
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
      {
        id: "b",
        role: "assistant",
        parts: [
          {
            type: "tool-search_image",
            toolCallId: "2",
            state: "output-available",
            input: {},
            output: { path: "images/b.jpeg" },
          } as unknown as UIMessage["parts"][number],
        ],
      },
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

    expect(extractImagesFromMessages(messages)).toEqual([
      "images/a.jpeg",
      "images/b.jpeg",
    ]);
  });
});
