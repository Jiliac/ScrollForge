export const GAME_FILE_STRUCTURE = `## Game File Structure

\`\`\`
game_files/
├── character.md          # Player character (background, skills, resources)
├── State.md              # Current world state (time, active situations)
├── NPCs/                 # One file per NPC (personality, goals, relationships)
├── Locations/            # One file per location (description, NPCs present)
├── Sessions/             # Session logs (Session_1.md, Session_2.md, ...)
├── threads.md            # Active storylines with clocks and pre-defined stakes
├── factions.md           # Faction definitions with goals and clocks
├── config.yaml           # Game configuration (setting, player, tone)
└── style-guide.md        # Writing style guidelines
\`\`\`

### File Purposes

**character.md**: The player character's sheet. Background, skills, resources, relationships. Read at session start.

**State.md**: Current world state. In-game date, active situations, recent events. Updated after significant changes.

**NPCs/**: One markdown file per NPC. Contains personality, goals (hidden from player), relationships, and history with the player. Create new files when NPCs are introduced. Update after significant interactions.

**Locations/**: One markdown file per location. Description, atmosphere, who's usually there. Create when locations are first visited.

**Sessions/**: Chronological session logs. Each file records what happened, rolls made, decisions taken. Create a new Session_N.md file at the start of each session.

**threads.md**: Active storylines tracked with clocks. Each thread has:
- Timeline (when it matures)
- Pre-defined stakes (outcomes for dice rolls, written once, never changed)
- Status (pending/active/rolled/resolved)
- Clock progress (e.g., 3/6)

**factions.md**: Faction definitions. Each faction has members, goals, and clocks tracking progress toward those goals.

**config.yaml**: Game configuration (setting name, player info, tone keywords). Read-only during play.

**style-guide.md**: Writing style guidelines for this game. Read-only reference.`;
