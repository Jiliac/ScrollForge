import { describe, it, expect } from "vitest";
import {
  dedupeAgentProgress,
  type MessageParts,
} from "@/components/chat/message-list";

describe("dedupeAgentProgress", () => {
  it("returns empty array for empty input", () => {
    expect(dedupeAgentProgress([])).toEqual([]);
  });

  it("keeps non-progress parts unchanged", () => {
    const parts: MessageParts = [
      { type: "text", text: "Hello" },
      { type: "text", text: "World" },
    ];
    expect(dedupeAgentProgress(parts)).toEqual(parts);
  });

  it("keeps only the latest state per agent", () => {
    const parts = [
      { type: "data-agent-progress", data: { agent: "orchestrator", status: "started" } },
      { type: "data-agent-progress", data: { agent: "orchestrator", status: "completed" } },
    ] as MessageParts;

    const result = dedupeAgentProgress(parts);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "data-agent-progress",
      data: { agent: "orchestrator", status: "completed" },
    });
  });

  it("dedupes multiple agents independently", () => {
    const parts = [
      { type: "data-agent-progress", data: { agent: "orchestrator", status: "started" } },
      { type: "data-agent-progress", data: { agent: "orchestrator", status: "completed" } },
      { type: "data-agent-progress", data: { agent: "faction_turn", status: "started" } },
      { type: "data-agent-progress", data: { agent: "faction_turn", status: "completed" } },
    ] as MessageParts;

    const result = dedupeAgentProgress(parts);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: "data-agent-progress",
      data: { agent: "orchestrator", status: "completed" },
    });
    expect(result[1]).toEqual({
      type: "data-agent-progress",
      data: { agent: "faction_turn", status: "completed" },
    });
  });

  it("preserves order of non-progress parts mixed with progress parts", () => {
    const parts = [
      { type: "data-agent-progress", data: { agent: "orchestrator", status: "started" } },
      { type: "text", text: "Hello" },
      { type: "data-agent-progress", data: { agent: "orchestrator", status: "completed" } },
      { type: "text", text: "World" },
    ] as MessageParts;

    const result = dedupeAgentProgress(parts);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: "text", text: "Hello" });
    expect(result[1]).toEqual({
      type: "data-agent-progress",
      data: { agent: "orchestrator", status: "completed" },
    });
    expect(result[2]).toEqual({ type: "text", text: "World" });
  });

  it("handles real-world message parts sequence", () => {
    const parts = [
      { type: "data-agent-progress", data: { agent: "orchestrator", status: "started" } },
      { type: "data-agent-progress", data: { agent: "orchestrator", status: "completed", summary: "Direct to narrator" } },
      { type: "step-start" },
      { type: "text", text: "The night has thinned..." },
    ] as MessageParts;

    const result = dedupeAgentProgress(parts);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      type: "data-agent-progress",
      data: { agent: "orchestrator", status: "completed", summary: "Direct to narrator" },
    });
    expect(result[1]).toEqual({ type: "step-start" });
    expect(result[2]).toEqual({ type: "text", text: "The night has thinned..." });
  });
});
