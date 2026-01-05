# RPG LLM Architecture

## Overview

Multi-agent system for running a text-based RPG with an active, consequential world. The core insight: separate world simulation from narrative generation to avoid LLM sycophancy.

## Core Concepts

### Agents vs Sequences

**Agents** are LLM calls with specific roles. Each agent has a focused responsibility and system prompt.

**Sequences** are code that orchestrates agent calls. They define the order and logic of when agents are invoked.

---

## Agents

### Orchestrator

**Role**: High-level decision maker. Decides which sequence to run based on player input and game state.

**Triggers**:

- Player sends message → Narration Sequence
- Time skip requested → Faction Turn Sequence
- New content needed → World Builder

**Model**: opus (needs broad reasoning)

**Tools**: None directly. Dispatches to sequences.

---

### Narrator

**Role**: Player-facing storyteller. Embodies the world responding to the player. Streams responses directly to the player.

**Responsibilities**:

- Narrate scenes with sensory detail
- Voice NPCs (surface level dialogue)
- Present choices and consequences
- Call Faction Agent when an NPC needs to make a consequential decision
- Use twist_of_fate for uncertain outcomes

**Model**: opus (quality matters for player experience)

**Tools**:

- `twist_of_fate` — dice rolls with pre-committed stakes
- `think_as_faction(faction_name)` — delegates to Faction Agent (blocking tool call)

**Does NOT**:

- Write to files (Archivist does this)
- Manage images directly (Image Mng does this)

---

### Faction Agent

**Role**: Plays one faction/NPC group. Pursues faction goals against player convenience.

**Input**:

- Faction context (goals, resources, relationships)
- Current situation
- Question: "What does this faction do/say/decide?"

**Output**: Faction's action/decision with reasoning

**Key behavior**: Adversarial when appropriate. NPCs don't exist to help the player — they help when it serves them.

**Model**: sonnet (good reasoning, cheaper than opus for multiple calls)

**Called by**: Narrator (mid-scene) or Faction Turn Sequence (between scenes)

---

### Archivist

**Role**: Writes to game files. Maintains the persistent world state.

**Responsibilities**:

- Update NPC files after interactions
- Update location files after changes
- Write session logs
- Update threads.md
- Append to conversation context

**Model**: haiku (structured task, doesn't need heavy reasoning)

**Tools**:

- `write_file`
- `edit_file`

**Called by**: End of Narration Sequence, end of Faction Turn Sequence

---

### Image Manager

**Role**: Handle all image operations.

**Responsibilities**:

- Search for existing images
- Generate new images via FLUX/BFL API
- Decide what visuals the scene needs

**Model**: haiku (straightforward decisions)

**Tools**:

- `search_image`
- `create_image`

**Called by**: End of Narration Sequence (parallel with Archivist)

---

### World Builder

**Role**: Create new world content. Called rarely, mostly prep-time.

**Creates**:

- New locations
- New NPCs (with goals)
- New situations/threads

**Model**: opus (creative, needs quality)

**Called by**: Orchestrator when new content is needed

---

## Sequences

### Narration Sequence

Triggered when player sends a message.

```
1. Narrator agent (streams to player)
   │
   ├─→ May call Faction Agent(s) via tool
   │   (blocking, when NPC needs to "think")
   │
   └─→ Returns complete response

2. In parallel:
   ├─→ Archivist (log what happened)
   └─→ Image Mng (visuals for scene)
```

### Faction Turn Sequence

Triggered on time skips or explicit "what happened while I was away?"

```
1. Select factions to advance:
   - 2 that player recently interacted with
   - 1 that player hasn't touched

2. For each faction:
   └─→ Faction Agent (what did they do?)

3. Archivist (record world changes)
```

---

## Context Management

### Design Principles

- All documents are markdown (LLM-generated, LLM-consumed)
- No JSON for game state — prose is the source of truth
- Append-only for safety
- All agents share the same context

### Context Structure

```typescript
interface ConversationContext {
  conversationId: string;
  files: string[]; // paths to game files to include
  additionalContext: string; // append-only prose for facts not in files
}
```

Stored in DB, linked to conversation.

### Context Initialization

At conversation start (or when context is stale):

1. Load all game files (~50k tokens currently)
2. One opus call: "Given all this, what's relevant for the current situation?"
3. Output becomes the `additionalContext` bootstrap
4. `files` populated with relevant subset

### Context Updates

Any agent can append to context:

- Add files to the list
- Append to `additionalContext` string

Append-only protects against accidental deletion. Compression/summarization is a future problem.

---

## NPC Goal Structure

Goals live in NPC markdown files. Format:

```markdown
## Goals (Hidden from Player)

### Current Goal

Get Tahir to accept a commission with an impossible deadline

**Advances when**: Tahir agrees to the commission
**Next**: Blame Tahir publicly for the failure

### Long-term Goal

Become the sole indigo supplier in the bazaar

### Relationships

- Allied with: Farhad-Tabari (guild master)
- Rival of: Rostam-Gilani (competing merchant)
- Owes favor to: Esmail-Sarraf (banker)
```

The Faction Agent reads this and pursues the goals. The Narrator sees it too but may not always invoke deep goal-pursuit for casual interactions.

---

## Future Ideas

### Criticizer Agent

Post-hoc review of agent outputs. Checks for:

- Sycophancy (did we let the player get away with something unrealistic?)
- World consistency violations
- Broken narrative logic

**Flow**:

1. Agent produces output
2. Criticizer reviews
3. If fail → retry with critique appended

**Model**: haiku (cheap, can run on every output)

**Status**: Not planned for initial implementation.

---

## Model Selection Summary

| Agent         | Model  | Rationale                      |
| ------------- | ------ | ------------------------------ |
| Orchestrator  | opus   | Needs broad reasoning          |
| Narrator      | opus   | Player-facing quality          |
| Faction Agent | sonnet | Good reasoning, multiple calls |
| Archivist     | haiku  | Structured writing task        |
| Image Mng     | haiku  | Straightforward decisions      |
| World Builder | opus   | Creative content               |
| Criticizer    | haiku  | Simple check, runs often       |

---

## Migration Path

### Phase 1: Foundation

- [ ] Context management (DB schema, append-only)
- [ ] Context initialization call
- [ ] Archivist agent (extract file writing from Narrator)

### Phase 2: Agent Separation

- [ ] Faction Agent + `think_as_faction` tool
- [ ] Image Mng agent (extract from Narrator)
- [ ] Narration Sequence orchestration

### Phase 3: Active World

- [ ] Faction Turn Sequence
- [ ] Goal structure in NPC files
- [ ] Time skip handling

### Phase 4: Polish

- [ ] World Builder agent
- [ ] Criticizer agent (optional)
- [ ] Context compression when needed
