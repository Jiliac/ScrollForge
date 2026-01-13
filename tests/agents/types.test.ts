import { describe, it, expect } from "vitest";
import { OrchestratorDecisionSchema } from "@/agents/types";

describe("OrchestratorDecisionSchema", () => {
  it("accepts valid decision", () => {
    const parsed = OrchestratorDecisionSchema.parse({
      preSteps: [{ type: "world_advance", description: "Advance threads" }],
      suggestedTwists: [
        { situation: "Crossing a stormy pass", reason: "Weather risk" },
      ],
      reasoning: "time skip",
    });

    expect(parsed.preSteps[0].type).toBe("world_advance");
  });

  it("rejects invalid preStep type", () => {
    expect(() =>
      OrchestratorDecisionSchema.parse({
        preSteps: [{ type: "nope" }],
        suggestedTwists: [],
        reasoning: "x",
      }),
    ).toThrow();
  });
});
