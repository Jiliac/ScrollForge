# Current Agentic Architecture (as implemented)

This document describes the **current** (implemented) agentic architecture in this codebase. It is **not** the target architecture described in `docs/architecture.md`. It is written for an LLM or developer that needs to understand the system’s real execution flow and constraints.

## High-level summary

There are two chat backends:

- **v1**: `POST /api/chat` — single streaming model call (no orchestrator, no pre-steps).
- **v2**: `POST /api/chat2` — **orchestrator + optional pre-steps + narrator** (streaming).

The “agentic” architecture currently lives in **v2** (`/api/chat2`), which implements:

1. Load game config + game context (markdown files).
2. Run **Orchestrator** (structured decision: pre-steps + suggested dice rolls).
3. Execute **pre-steps** (world*advance and/or faction_turn) \_before* narration (non-streaming).
4. Run **Narrator** (streaming) with tools enabled.
5. Persist messages client-side (not in this route), and persist agent logs server-side.

A simplified flow matches the diagram in `docs/agent_flow.jpg`:

Player message
→ Orchestrator (decides pre-steps + suggests dice rolls)
→ [optional] World Advance and/or Faction Turn (pre-steps)
→ Pre-step summary
→ Narrator (streams response; can call tools)
→ Player

## Core runtime entry points

### v2 chat route (agentic): `src/app/api/chat2/route.ts`

**Request shape**

- Accepts JSON: `{ conversationId: string, messages: UIMessage[] }`

**Response**

- Streams a UIMessage response via `toUIMessageStreamResponse()`.
- Adds metadata on finish:
  - `conversationId`
  - `orchestrator.preSteps`, `orchestrator.suggestedTwists`
  - `orchestrator.reasoning` only in development
  - token usage

**Key behavior**

- Ensures the conversation exists in DB (scoped to the current game).
- Loads:
  - `config.yaml` via `loadGameConfig()`
  - game context (markdown files) via `loadGameContext()`
- Builds a **system prompt** for the narrator using `getSystemPrompt(config)`.
- Injects a synthetic “game context” message into the message list:
  - `# Game Context\n\n{context}`
- Runs orchestrator on the combined messages (context + user messages).
- Executes pre-steps (if any) and builds a pre-step summary string.
- Runs narrator streaming with:
  - the same system prompt
  - the same messages (context + user messages)
  - plus an injected “orchestrator context” message (pre-step summary + suggested dice rolls)

### v1 chat route (non-agentic): `src/app/api/chat/route.ts`

This is a single streaming model call with tools. It does not run orchestrator or pre-steps. It still injects `# Game Context` as a user message if context exists.

## Game context and configuration

### Game files directory

`src/lib/game-files.ts` defines the game files root:

- `GAME_FILES_DIR` env var, else `game_files_local` in the repo root.

### Context loading

`loadGameContext()`:

- Recursively reads `*.md` under the game files directory.
- Skips directories: `videos/`, `images/`.
- Skips files: `config.yaml`, `style-guide.md`, `system.md`.
- Produces a single concatenated string with sections like:
  - `## NPCs/Mahmud-Tabari.md\n\n...`
  - separated by `---`.

This context string is injected into the model conversation as a **user** message with id `"game-context"`.

### Game config

`src/lib/game-config.ts` loads and validates `config.yaml` using Zod. If missing/invalid, it returns a default config.

The narrator system prompt is derived from this config (setting, tone, institutions, etc.).

## Persistence model (DB) and scoping

### Game scoping

The DB has a `Game` record keyed by `filesDir` (the current `GAME_FILES_DIR`). This is used to scope:

- conversations
- messages
- images

`getCurrentGameId()` returns the current game id.

### Conversations and messages

`src/lib/conversations.ts`:

- `ensureConversationExists(id)` creates a conversation if missing for the current game.
- `saveMessages(conversationId, messages)` upserts messages by message id and stores `parts` as JSON.
- `loadConversation(id)` loads messages ordered by `createdAt`.

**Important**: The chat routes do not save messages directly. The client posts messages to:

- `POST /api/conversations/[id]/messages` (see `src/app/api/conversations/[id]/messages/route.ts`)

### Agent logs

`src/lib/agent-logs.ts` provides:

- `startAgentLog(conversationId, agentType, input?)`
- `completeAgentLog(logId, output)`
- `failAgentLog(logId, error)`
- `refuseAgentLog(logId, reason)`
- `getAgentLogs(conversationId)`

There is an API route:

- `GET /api/conversations/[id]/agent-logs` (see `src/app/api/conversations/[id]/agent-logs/route.ts`)

Agents that currently log:

- orchestrator
- narrator
- world_advance
- faction_turn

## Agents (implemented)

### 1) Orchestrator

**Code**

- `src/agents/orchestrator.ts`
- Prompt: `src/agents/prompts/orchestrator.ts`
- Output schema: `src/agents/types.ts` (`OrchestratorDecisionSchema`)

**Purpose**

- Decide whether any **pre-steps** are needed before narration.
- Suggest **in-scene dice roll situations** (suggestedTwists) when appropriate.

**Output**

- `preSteps: PreStep[]` where `PreStep` is one of:
  - `{ type: "world_advance", description: string }`
  - `{ type: "faction_turn", faction: string, situation: string }`
- `suggestedTwists: { situation: string, reason: string }[]`
- `reasoning: string`

**Model behavior**

- Primary model: OpenAI `gpt-5.2` via `generateObject`.
- Retry fallback: Anthropic `claude-opus-4-5-20251101` via `generateObject` if the first attempt fails.
- If both fail: returns a safe fallback decision (no pre-steps, no twists).

**Important constraints encoded in the prompt**

- Pre-steps should be rare; default is none.
- `faction_turn` must only use NPCs/factions that exist in game files (NPCs/ folder).
- `world_advance` should run before `faction_turn` if it needs to create missing content.
- `suggestedTwists` should only cover genuine chance/physical risk, not NPC negotiations.

### 2) World Advance (World Simulator)

**Code**

- `src/agents/world-builder.ts` (function: `runWorldAdvance`)
- Prompt: `src/agents/prompts/world-advance.ts`
- Tools: `worldAdvanceTools` from `src/app/api/chat/tools/index.ts`

**Purpose**

- Create missing world content (NPCs/Locations) and/or resolve maturing threads during time skips.

**Execution**

- Non-streaming `generateText` with:
  - model: OpenAI `gpt-5.2`
  - tools enabled (including `twist_of_fate`)
  - stop condition: `stepCountIs(5)`

**Refusal protocol**

- If the model output starts with `REFUSED:`, the agent returns a refused summary and does not proceed.

**Tool call extraction**

- The code extracts tool calls from the AI SDK `steps` array and normalizes arguments from `input` (preferred) or `args` (fallback).

### 3) Faction Turn (Off-screen NPC/faction actions)

**Code**

- `src/agents/faction-turn.ts` (function: `runFactionTurn`)
- Prompt: `src/agents/prompts/faction-turn.ts`
- Tools: `factionTools` from `src/app/api/chat/tools/index.ts` (no dice tool)

**Purpose**

- Simulate off-screen actions by a specific NPC/faction when time passes.

**Execution**

- Non-streaming `generateText` with:
  - model: OpenAI `gpt-5.2`
  - tools enabled (file + image tools; no `twist_of_fate`)
  - stop condition: `stepCountIs(5)`

**Refusal protocol**

- Same `REFUSED:` convention as world_advance.

**Expected behavior**

- Update `factions.md` “Recent Actions” via `edit_file` tool.
- Keep response brief; do not narrate to the player.

### 4) Narrator (Player-facing GM)

**Code**

- `src/agents/narrator.ts` (function: `runNarrator`)
- Prompt builder: `src/agents/prompts/narrator.ts` (function: `getSystemPrompt(config)`)
- Tools: passed in from the route (typically `tools` from `src/app/api/chat/tools/index.ts`)

**Purpose**

- Stream the player-facing narrative response.
- Can call tools (dice, file writes/edits, image search/create) during narration.

**Execution**

- Streaming `streamText` with:
  - model: OpenAI `gpt-5.2`
  - stop condition: `stepCountIs(20)`
  - tools enabled

**Orchestrator context injection**
Before the last user message, narrator receives an extra user message containing:

- `# What Happened Off-Screen` (pre-step summary)
- `# Suggested Dice Rolls` (suggestedTwists list)

This is implemented in `buildOrchestratorContext()` and inserted into the message list.

**Logging**

- Starts an agent log at the beginning.
- Marks completion in `onFinish` of the stream.

## Tools (implemented)

Tools are defined under `src/app/api/chat/tools/*` and exported via `src/app/api/chat/tools/index.ts`.

### Tool sets

- `tools` (narrator / general):
  - `write_file`
  - `edit_file`
  - `search_image`
  - `create_image`
  - `twist_of_fate`

- `factionTools` (faction_turn):
  - `write_file`
  - `edit_file`
  - `search_image`
  - `create_image`
  - (no dice tool)

- `worldAdvanceTools` (world_advance):
  - all of `tools` including `twist_of_fate`

### Notable tool behaviors

- `edit_file`: replace a unique `old_string` with `new_string` (must occur exactly once).
- `write_file`: writes content to a file under the game files directory.
- `twist_of_fate`: parses a stakes string into 1–100 ranges, rolls 1–100, returns matched outcome.
- `search_image`: searches images in DB (scoped to current game) by slug/tags/prompt.
- `create_image`: calls BFL/FLUX API, writes image to `game_files/images/`, inserts DB record, and appends a markdown image reference to a specified markdown file.

## Image serving and UI integration

### Serving images

`GET /api/images/[...path]` serves files from `{GAME_FILES_DIR}/images/`.

### UI image extraction

The UI tracks images by watching tool parts:

- `src/hooks/use-chat-effects.ts` detects tool outputs for `create_image` and `search_image` and calls `onImageChange(path)`.

Additionally, server-side initial image extraction for a conversation:

- `extractImagesFromMessages(messages)` in `src/lib/conversations.ts` scans message parts for tool outputs and returns image paths.

## What is NOT implemented yet (relative to target)

Compared to `docs/architecture.md` (target), the current implementation does **not** include:

- A separate **Archivist agent** that updates files after narration (post-stream).
  - Currently, the narrator itself can call `write_file` / `edit_file` during streaming.
- A separate **Image Manager agent** that decides what images to create/search post-stream.
  - Currently, the narrator can call image tools directly.
- A `think_as_faction` tool that delegates mid-scene to a faction agent.
  - Faction simulation exists as `faction_turn` pre-step, not as an in-scene delegation tool.
- Parallel post-processing after narration (Archivist + Image Manager).
- Context compression / selective file inclusion per conversation.
  - Current approach injects the full markdown context (minus skipped files) each request.
- A dedicated “sequence” layer module; orchestration is currently implemented directly in `chat2/route.ts`.

## Operational invariants and conventions

- **Truth source** for world state is the markdown files under `GAME_FILES_DIR` (plus DB for conversations/images/logs).
- Pre-steps are intended to be rare; orchestrator should default to none.
- `REFUSED:` is a hard stop convention for pre-step agents when the request is incoherent.
- Dice outcomes are externalized via `twist_of_fate` and must be honored by narration.
- Conversation and image records are scoped to the current game (by `filesDir`).

## Quick file map (implementation)

- Orchestrator:
  - `src/agents/orchestrator.ts`
  - `src/agents/prompts/orchestrator.ts`
  - `src/agents/types.ts`

- Pre-steps:
  - `src/agents/world-builder.ts`
  - `src/agents/faction-turn.ts`
  - `src/agents/prompts/world-advance.ts`
  - `src/agents/prompts/faction-turn.ts`

- Narrator:
  - `src/agents/narrator.ts`
  - `src/agents/prompts/narrator.ts`

- Tools:
  - `src/app/api/chat/tools/*`
  - `src/app/api/chat/tools/index.ts`

- Context:
  - `src/lib/game-files.ts`
  - `src/lib/game-config.ts`

- Persistence:
  - `src/lib/conversations.ts`
  - `src/lib/image-index.ts`
  - `src/lib/agent-logs.ts`
  - `src/lib/prisma.ts`

- API routes:
  - `src/app/api/chat/route.ts` (v1)
  - `src/app/api/chat2/route.ts` (v2)
  - `src/app/api/conversations/[id]/messages/route.ts`
  - `src/app/api/conversations/[id]/agent-logs/route.ts`
  - `src/app/api/images/[...path]/route.ts`
