import { describe, it, expect, vi, beforeEach } from "vitest";

describe("loadGameConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.GAME_FILES_DIR = "/test-game";
  });

  it("parses valid YAML config", async () => {
    const validYaml = `
setting:
  name: "Persian Empire"
  era: "Golden Age"
player:
  name: "Tahir"
  role: "Craftsman"
tone:
  style_inspiration: "1001 Nights"
  keywords: ["evocative", "mystical"]
world:
  institutions: ["guilds", "bazaars"]
  location_types: ["cities", "deserts"]
  atmosphere: "mystery and wonder"
examples:
  npc_warning: "Beware the vizier"
  player_action: "The player haggles"
`;

    vi.doMock("fs", () => ({
      promises: {
        readFile: vi.fn().mockResolvedValue(validYaml),
      },
    }));

    const { loadGameConfig } = await import("@/lib/game-config");
    const config = await loadGameConfig();

    expect(config.setting.name).toBe("Persian Empire");
    expect(config.player.name).toBe("Tahir");
    expect(config.tone.keywords).toContain("evocative");
  });

  it("returns default config when file not found", async () => {
    vi.doMock("fs", () => ({
      promises: {
        readFile: vi.fn().mockRejectedValue(new Error("ENOENT")),
      },
    }));

    const { loadGameConfig } = await import("@/lib/game-config");
    const config = await loadGameConfig();

    expect(config.setting.name).toBe("Fantasy World");
    expect(config.player.name).toBe("the player");
  });

  it("returns default config when YAML is invalid", async () => {
    vi.doMock("fs", () => ({
      promises: {
        readFile: vi.fn().mockResolvedValue("not: valid: yaml: ["),
      },
    }));

    const { loadGameConfig } = await import("@/lib/game-config");
    const config = await loadGameConfig();

    expect(config.setting.name).toBe("Fantasy World");
  });

  it("returns default config when schema validation fails", async () => {
    const invalidYaml = `
setting:
  name: "Test"
  # missing era
player:
  name: "Test"
  role: "Test"
`;

    vi.doMock("fs", () => ({
      promises: {
        readFile: vi.fn().mockResolvedValue(invalidYaml),
      },
    }));

    const { loadGameConfig } = await import("@/lib/game-config");
    const config = await loadGameConfig();

    // Should fall back to default
    expect(config.setting.name).toBe("Fantasy World");
  });
});
