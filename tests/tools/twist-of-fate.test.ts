import { describe, it, expect, vi } from "vitest";
import { twistOfFateTool } from "@/app/api/chat/tools/twist-of-fate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = Record<string, any>;

const exec = (args: { stakes: string }) =>
  twistOfFateTool.execute!(args, {
    messages: [],
    toolCallId: "test",
  }) as unknown as Promise<Result>;

describe("twistOfFateTool", () => {
  it("rejects stakes that don't start at 1", async () => {
    const res = await exec({ stakes: "2-100: nope" });
    expect(res.success).toBe(false);
  });

  it("rejects stakes that don't end at 100", async () => {
    const res = await exec({ stakes: "1-99: nope" });
    expect(res.success).toBe(false);
  });

  it("rejects gaps", async () => {
    const res = await exec({ stakes: "1-10: a 12-100: b" });
    expect(res.success).toBe(false);
  });

  it("rolls deterministically when Math.random is mocked", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // => roll 1

    const res = await exec({ stakes: "1-50: low 51-100: high" });
    expect(res).toEqual({ success: true, roll: 1, outcome: "low" });
  });
});
