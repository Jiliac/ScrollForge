import { describe, it, expect, vi } from "vitest";
import { twistOfFateTool } from "@/app/api/chat/tools/twist-of-fate";

describe("twistOfFateTool", () => {
  it("rejects stakes that don't start at 1", async () => {
    const res = await twistOfFateTool.execute({
      stakes: "2-100: nope",
    });
    expect(res.success).toBe(false);
  });

  it("rejects stakes that don't end at 100", async () => {
    const res = await twistOfFateTool.execute({
      stakes: "1-99: nope",
    });
    expect(res.success).toBe(false);
  });

  it("rejects gaps", async () => {
    const res = await twistOfFateTool.execute({
      stakes: "1-10: a 12-100: b",
    });
    expect(res.success).toBe(false);
  });

  it("rolls deterministically when Math.random is mocked", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // => roll 1

    const res = await twistOfFateTool.execute({
      stakes: "1-50: low 51-100: high",
    });

    expect(res).toEqual({ success: true, roll: 1, outcome: "low" });
  });
});
