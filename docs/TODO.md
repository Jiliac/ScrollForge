# TODO: Multi-Agent RPG System

## Orchestrator (DONE)

- [x] Basic orchestrator with `generateObject`
- [x] `world_advance` pre-step (renamed from world_build)
- [x] `faction_turn` pre-step
- [x] `suggestedTwists` for scene-level dice rolls
- [x] Prompt tuning (use existing NPCs, empty array defaults)

---

## Game File Structure

### Restructure game files folder

```
game_files/
├── NPCs/              # Individual NPCs (existing)
├── Locations/         # Locations (existing)
├── Sessions/          # Session logs (existing)
├── factions.md        # NEW: faction definitions
├── historical_study/  # Background research
├── character.md       # Player character
├── state.md           # Current world state
├── threads.md         # Restructure with clocks (see below)
└── notes.md           # Player notes (don't load)
```

### Move to code prompts

- [x] `system.md` → `src/agents/prompts/narrator.ts`
- [x] `style-guide.md` → `src/agents/prompts/narrator.ts` [Actually the style guide is part of the needed files]
- [x] `Emerging Pattern for Raw LLM RPG.md` → shared agent principles (maybe)

### Create factions.md

Structure:

```markdown
# Factions

## Tabari Family (Guild Power)

- Members: Mahmud-Tabari, Farhad-Tabari
- Goal: Maintain dye monopoly, control guild succession
- Clock: 3/6 toward exposing Tahir's crimson secret

## Sarraf Network (Finance)

- Members: Esmail-Sarraf
- Goal: Expand hawala influence
- Clock: 0/4
```

### Restructure threads.md with clocks

```markdown
## Active Threads

### Commission Deadline

- Clock: 5/8
- Matures: Day 10
- Stakes: "1-20: Failure, reputation damaged..."
- Owner: Mahmud-Tabari

### Tax Inquiry

- Clock: 4/6
- Matures: Day 12
- Stakes: "1-20: ..."
```

[Note: Done. Encoded in the system promtps, and migrated the existing files.]

---

## Agent Implementation

### world_advance agent (currently stub)

- [ ] Implement planner-executor pattern
- [ ] Create new content (locations, NPCs) when needed
- [ ] Resolve maturing threads (roll dice for them)
- [ ] Advance thread clocks based on time passed
- [ ] Write results to game files

### faction_turn agent (currently stub)

- [x] Implement faction decision-making
- [x] Read faction goals from factions.md
- [x] Produce "what did faction X do" summary
- [x] ~~Pass results as context to narrator (not instructions)~~

### Narrator improvements

- [x] Move system.md content to code prompt
- [x] Move style-guide.md content to code prompt
- [x] Better integration with pre-step summaries

---

## Context Management (future optimization)

### Selective file loading

- [ ] Don't load `notes.md` (player notes)
- [ ] Don't load `historical_study/` every turn (background research)
- [ ] Consider conversation-specific context tracking

### Context compression

- [ ] Summarize old sessions
- [ ] Track which files are relevant per conversation

---

## Testing Infrastructure

### Eval scripts (started)

- [x] `scripts/eval/test-orchestrator.ts` - test orchestrator decisions
- [ ] `scripts/eval/test-faction-turn.ts` - test faction agent
- [ ] `scripts/eval/test-world-advance.ts` - test world advance agent
- [ ] `scripts/eval/test-narrator.ts` - test narrator with pre-step context

---

## Notes

- Orchestrator is a router, not a director
- Faction agents have agency (not dice) for NPC decisions
- Dice (twist_of_fate) only for physical/material risk and pure chance
- Thread rolls happen in world_advance, scene rolls suggested to narrator
