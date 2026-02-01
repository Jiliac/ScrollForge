import { z } from "zod";
import { prisma } from "./prisma";

const GameConfigSchema = z.object({
  setting: z.object({ name: z.string(), era: z.string() }),
  player: z.object({ name: z.string(), role: z.string() }),
  tone: z.object({
    style_inspiration: z.string(),
    keywords: z.array(z.string()),
  }),
  world: z.object({
    institutions: z.array(z.string()),
    location_types: z.array(z.string()),
    atmosphere: z.string(),
  }),
  examples: z.object({
    npc_warning: z.string(),
    player_action: z.string(),
  }),
});

export type GameConfig = z.infer<typeof GameConfigSchema>;

export async function loadGameConfig(gameId: string): Promise<GameConfig> {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { config: true },
    });

    if (!game?.config) {
      return getDefaultConfig();
    }

    return GameConfigSchema.parse(game.config);
  } catch (error) {
    console.error("Error loading or parsing game config:", error);
    return getDefaultConfig();
  }
}

function getDefaultConfig(): GameConfig {
  return {
    setting: {
      name: "Fantasy World",
      era: "a time of adventure and mystery",
    },
    player: {
      name: "the player",
      role: "adventurer",
    },
    tone: {
      style_inspiration: "classic fantasy literature",
      keywords: ["evocative", "grounded", "morally complex"],
    },
    world: {
      institutions: ["guilds", "markets", "taverns"],
      location_types: ["towns", "dungeons", "wilderness"],
      atmosphere: "adventure, danger, and discovery",
    },
    examples: {
      npc_warning: "Are you certain? The lord will hear of this.",
      player_action: "The player attempts to negotiate a better price.",
    },
  };
}
