// File structure documentation for the Archivist agent (and Narrator until Archivist exists)

export const THREADS_FILE_STRUCTURE = `## threads.md Structure

Each thread tracks an active storyline with a clock measuring progress toward resolution.

\`\`\`markdown
### [Thread Name]

- **Clock:** X/Y (progress toward maturation)
- **Matures:** [in-game date or condition]
- **Owner:** [NPC or faction driving this thread]
- **Stakes:** "1-15: [dire]. 16-35: [setback]. 36-65: [mixed]. 66-85: [success]. 86-100: [fortune]."
- **Status:** pending | active | rolled | resolved

[Brief description of the situation]
\`\`\`

### Clock Rules

- **Advance clocks** when time passes or relevant events occur (typically +1 per significant time skip)
- **Roll when clock fills** (X reaches Y) or when the thread's condition triggers
- **Stakes are immutable** — once written, they cannot be softened
- **Move to Resolved** after rolling, noting the outcome

### Roll Log

Keep a table at the bottom:
\`\`\`markdown
| Date (in-game) | Thread | Roll | Outcome |
| --- | --- | --- | --- |
\`\`\``;

export const FACTIONS_FILE_STRUCTURE = `## factions.md Structure

Each faction has members, goals, and clocks tracking progress toward those goals.

\`\`\`markdown
## [Faction Name] ([Type])

**Members:** [NPC-1], [NPC-2], ...
**Goal:** [What they're working toward]
**Clock:** X/Y toward [specific outcome]

### Relationships
- Allied with: [faction/NPC]
- Opposed to: [faction/NPC]
- Owes/owed by: [faction/NPC]

### Recent Actions
- [Date]: [What they did]
\`\`\`

### Faction Clock Rules

- **Advance clocks** during faction turns (when time passes off-screen)
- **When clock fills:** The faction achieves their goal or forces a confrontation
- **Goals can change** after a clock resolves — factions adapt`;

export const ARCHIVIST_FILE_STRUCTURES = `${THREADS_FILE_STRUCTURE}

${FACTIONS_FILE_STRUCTURE}`;
