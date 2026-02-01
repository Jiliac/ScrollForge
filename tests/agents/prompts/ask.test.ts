import { describe, it, expect } from "vitest";
import { getAskSystemPrompt } from "@/agents/prompts/ask";
import type { GameConfig } from "@/lib/game-config";

const config: GameConfig = {
  setting: { name: "Aethermoor", era: "Late Bronze Age" },
  player: { name: "Kael", role: "wandering merchant" },
  tone: { style_inspiration: "Ursula Le Guin", keywords: ["melancholy"] },
  world: {
    institutions: ["The Silver Conclave", "The Iron Watch"],
    location_types: ["desert", "ruins"],
    atmosphere: "tense and foreboding",
  },
  examples: {
    npc_warning: "The elder shakes her head.",
    player_action: "You draw your blade.",
  },
};

describe("getAskSystemPrompt", () => {
  const prompt = getAskSystemPrompt(config);

  it("includes setting name and era", () => {
    expect(prompt).toContain("Aethermoor");
    expect(prompt).toContain("Late Bronze Age");
  });

  it("includes player name and role", () => {
    expect(prompt).toContain("Kael");
    expect(prompt).toContain("wandering merchant");
  });

  it("includes institutions", () => {
    expect(prompt).toContain("The Silver Conclave");
    expect(prompt).toContain("The Iron Watch");
  });

  it("includes atmosphere", () => {
    expect(prompt).toContain("tense and foreboding");
  });

  it("states it is NOT the Game Master", () => {
    expect(prompt).toContain("You are NOT the Game Master");
  });

  it("mentions search_image tool", () => {
    expect(prompt).toContain("search_image");
  });

  it("does not mention write, edit, or create tools", () => {
    expect(prompt).not.toContain("write_file");
    expect(prompt).not.toContain("edit_file");
    expect(prompt).not.toContain("create_image");
  });
});
