import { describe, it, expect, vi, beforeEach } from "vitest";

const GAME_ID = "test-game-id";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    game: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { loadGameConfig } from "@/lib/game-config";

describe("loadGameConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses valid config from DB", async () => {
    const validConfig = {
      setting: { name: "Persian Empire", era: "Golden Age" },
      player: { name: "Tahir", role: "Craftsman" },
      tone: {
        style_inspiration: "1001 Nights",
        keywords: ["evocative", "mystical"],
      },
      world: {
        institutions: ["guilds", "bazaars"],
        location_types: ["cities", "deserts"],
        atmosphere: "mystery and wonder",
      },
      examples: {
        npc_warning: "Beware the vizier",
        player_action: "The player haggles",
      },
    };

    vi.mocked(prisma.game.findUnique).mockResolvedValueOnce({
      config: validConfig,
    } as never);

    const config = await loadGameConfig(GAME_ID);

    expect(config.setting.name).toBe("Persian Empire");
    expect(config.player.name).toBe("Tahir");
    expect(config.tone.keywords).toContain("evocative");
    expect(prisma.game.findUnique).toHaveBeenCalledWith({
      where: { id: GAME_ID },
      select: { config: true },
    });
  });

  it("returns default config when game not found", async () => {
    vi.mocked(prisma.game.findUnique).mockResolvedValueOnce(null);

    const config = await loadGameConfig(GAME_ID);

    expect(config.setting.name).toBe("Fantasy World");
    expect(config.player.name).toBe("the player");
  });

  it("returns default config when config is null", async () => {
    vi.mocked(prisma.game.findUnique).mockResolvedValueOnce({
      config: null,
    } as never);

    const config = await loadGameConfig(GAME_ID);

    expect(config.setting.name).toBe("Fantasy World");
  });

  it("returns default config when schema validation fails", async () => {
    const invalidConfig = {
      setting: { name: "Test" },
      // missing required fields
    };

    vi.mocked(prisma.game.findUnique).mockResolvedValueOnce({
      config: invalidConfig,
    } as never);

    const config = await loadGameConfig(GAME_ID);

    // Should fall back to default
    expect(config.setting.name).toBe("Fantasy World");
  });
});
