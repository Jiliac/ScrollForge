import { promises as fs } from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import { getGameFilesDir } from "./game-files";

export interface GameConfig {
  setting: {
    name: string;
    era: string;
  };
  player: {
    name: string;
    role: string;
  };
  tone: {
    style_inspiration: string;
    keywords: string[];
  };
  world: {
    institutions: string[];
    location_types: string[];
    atmosphere: string;
  };
  examples: {
    npc_warning: string;
    player_action: string;
  };
}

export async function loadGameConfig(): Promise<GameConfig> {
  const gameFilesDir = getGameFilesDir();
  const configPath = path.join(gameFilesDir, "config.yaml");

  try {
    const content = await fs.readFile(configPath, "utf-8");
    return parseYaml(content) as GameConfig;
  } catch (error) {
    console.error("Error loading game config:", error);
    // Return a default config if file doesn't exist
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
