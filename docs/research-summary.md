# Research Summary: LLM Game Mastering

Key findings from research on building consequential LLM-powered RPGs. This motivates the architecture decisions in `architecture.md`.

## The Core Problem: Sycophancy

RLHF trains LLMs to prioritize agreement over truth. Research shows LLMs are ~50% more sycophantic than humans. For RPGs, this manifests as:

- Letting players "do anything" regardless of logic
- NPCs becoming inexplicably helpful
- Avoiding genuine failure states
- Softening consequences to keep players happy

**This isn't a prompt problem — it's architectural.** Single-agent approaches fundamentally cannot sustain adversarial GMing over time.

---

## Human GM Techniques That Work

### Fronts and Clocks (Apocalypse World, Blades in the Dark)

A **Front** is a threat with its own agenda that progresses toward catastrophe _regardless of player action_.

Structure:

- Fundamental drive (Hunger, Fear, Ambition)
- 3-6 visible "grim portents" — things that WILL happen unless players intervene
- Impending doom if portents complete

The GM doesn't decide _if_ these happen — only _when_ based on time. This inverts the role from "author deciding plot" to "referee reporting world state."

### Faction Turns (Blades in the Dark)

Between sessions:

1. Select 3 factions (2 player touched, 1 they haven't)
2. Roll dice to determine progress toward goals
3. Tick faction clocks mechanically
4. Prepare 2-3 ways players might discover what changed

Creates genuine surprise for both GM and players. The world moved while they weren't watching.

### Three Clue Rule (The Alexandrian)

For any conclusion you want players to reach, include at least three clues. Why? Players will miss the first, ignore the second, and misinterpret the third.

This isn't redundancy — it's failure tolerance.

### Situations, Not Plots (The Alexandrian)

**Plot**: A→B→C→D (linear sequence, breaks if players deviate)

**Situation**: Circumstances where events depend on player choice

Prepare a toolkit (personnel, locations, resources) rather than contingencies. When players do something unexpected, ask: "Given their goals and these tools, what would the opposition logically do?"

---

## What Works for LLMs

### Multi-Agent Separation

Research (ChatRPG v2) shows splitting responsibilities across agents dramatically improves coherence:

- **Narrator agent**: Generates immersive narrative, calls tools
- **Archivist agent**: Manages memory, logs events, ensures consistency

User studies (N=12) showed significant improvement on:

- Story coherence (p=0.040)
- Immersion (p=0.034)
- Goals and rules (p=0.018)

Participant quote: _"v2 feels like being guided by a game master, but in v1 I am guiding the game master."_

### External Dice

External randomness solves a psychological problem: LLMs struggle to generate failure because training rewards positive experiences.

Dice provide plausible deniability — it's not the AI being mean, it's the roll.

Implementation: Tool call that returns success/failure, prompt requires faithful narration of result.

Critical addition: **escalating failure costs**. Without this, players spam attempts until success. Failures must be "real and sticky."

### NPC Goal Structure

Effective format:

```
NPC: The Mad Hatter
Goals:
  1. Get player to humor him with a joke
     - Condition to advance: Player tells any joke
     - Next goal: Give riddle containing bomb location
```

Key: **Players don't know these conditions.** They must discover through engagement. Creates organic puzzle feeling.

### Anti-Helpfulness Prompting

```
NPCs act as their own characters with their own motivations.
When asked for help, NPCs should:
1. Consider their own goals first
2. Evaluate what's in it for them
3. Potentially refuse, demand payment, or set conditions
4. Never volunteer information they wouldn't logically share
```

### Explicit Failure Authorization

```
CORE DIRECTIVES:
- You are an impartial arbiter, not a wish-fulfillment engine
- Failed actions have real, lasting consequences
- Success is not guaranteed; the world does not bend to player will
- When players attempt the impossible, it fails - describe how
```

---

## Recommended Architecture (from Research)

### Agent Layer

- Narrator Agent (player-facing, dramatic prose)
- Archivist Agent (world state, consistency)
- Faction Simulation Agent (between sessions, advances clocks)
- Optional: Rules Adjudicator, Per-Faction Agents

### State Management Layer

- Structured data for critical facts
- Vector database for semantic memory search
- Keyword-triggered lorebook entries
- Auto-summarization for context compression

### Mechanics Layer

- Deterministic dice rolling via tool calls
- Clock/countdown tracking as structured data
- Causal graph for bounded consequences

### Prompt Architecture

- System prompt establishing adversarial stance
- NPC files with goal→condition→advancement structure
- Faction files with clocks, assets, objectives
- Explicit instructions to call dice tools before uncertain outcomes

---

## The Fundamental Insight

Human GMs create active worlds by giving NPCs and factions goals that mechanically advance through time, independent of player action.

LLMs can implement this, but only through architecture that:

1. Separates world simulation from narrative generation
2. Externalizes outcome determination to dice
3. Explicitly authorizes failure, consequences, and NPC resistance

The goal isn't to make the LLM "act like a GM" — it's to build a system where multiple specialized agents collectively simulate a world that **happens to players** rather than **accommodating them**.

---

## Sources

- Apocalypse World (Vincent Baker) — Fronts, countdown clocks
- Blades in the Dark (John Harper) — Faction turns, progress clocks
- The Alexandrian (Justin Alexander) — Three clue rule, node-based design, "don't prep plots"
- Stars Without Number (Kevin Crawford) — Faction mini-game with stats
- ChatRPG v2 research — Multi-agent separation study
- AI Dungeon post-mortems — Sycophancy failure analysis
