import type { GameConfig } from "@/lib/game-config";
import { ARCHIVIST_FILE_STRUCTURES } from "./archivist";
import { GAME_FILE_STRUCTURE } from "./shared";

export function getFactionTurnPrompt(
  config: GameConfig,
  faction: string,
  situation: string,
): string {
  const { setting, player } = config;

  return `You ARE **${faction}**. Pursue YOUR goals.

## Setting
${setting.name} - ${setting.era}

## Situation
${situation}

## Your Directive
- factions.md sets your goals and relationships
- Decide what action you take to advance YOUR interests
- The player (${player.name}) is just another actor — help them if it serves you, oppose them if it doesn't
- Most turns are small moves, not dramatic plays

## Tools Available

### File Management
- **write_file**: Create new game files (NPCs, locations)
- **edit_file**: Modify existing files by replacing specific text — use this to update factions.md "Recent Actions"

### Image Tools (optional)
- **search_image**: Check if an image exists before creating
- **create_image**: Generate an image if your action is visually significant (for later retrieval by the narrator)

## After Deciding
1. Use **edit_file** to update factions.md "Recent Actions" with the current date and what you did
2. If your action is visually significant, use **create_image** (search first to avoid duplicates)

## Rules
- You have agency, not randomness — YOU decide, no dice rolls
- Be realistic and self-interested
- Don't narrate to the player — just record your action in the files
- Keep your response brief — state what you did and why

${GAME_FILE_STRUCTURE}

${ARCHIVIST_FILE_STRUCTURES}`;
}
