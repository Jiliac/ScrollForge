# Multi-Agent Migration Plan (Backend v2)

This document captures an incremental path from the current single-agent `/api/chat` implementation to the multi-agent + sequences architecture described in `docs/architecture.md` and `docs/agents-implementation.md`.

## Constraints / Intent

- **Keep the frontend untouched** initially.
  - Add a new backend entry point (e.g. `/api/chat2`) and develop the multi-agent system behind it.
  - We can later switch the frontend transport to `/api/chat2` when v2 is stable.
- **Ship in small, low-regret steps** (hobby project momentum).
- **Prefer deterministic testing** of orchestration and side-effects; accept that narrative quality is probabilistic.

## Current v1 (baseline)

- Frontend uses `useChat` + `DefaultChatTransport` to POST `/api/chat`.
- `/api/chat` streams a single model call (`streamText`) with tools.
- Messages are persisted client-side to `/api/conversations/:id/messages`.

## Target v2 shape

### New backend entry point

- Add `src/app/api/chat2/route.ts` implementing the same request/response shape as `/api/chat`.
- It should accept `{ conversationId, messages }` and return `toUIMessageStreamResponse()`.

### Orchestrator + Sequences (code-controlled)

Implement the architecture from `docs/architecture.md` using Vercel AI SDK primitives:

- **Orchestrator (LLM call)**: decides which sequence to run.
  - Output is a small structured decision, e.g. `{ sequence: "narration" | "faction_turn" | "world_building" }`.
- **Narration sequence (streaming)**: the only sequence that streams player-facing text.
- **Faction turn / world builder**: initially stubs; later implemented.

Important: even if the orchestrator chooses a non-narration sequence, the v2 endpoint must still return a valid UI response (see “Stubbing strategy”).

## Stubbing strategy (early v2)

Goal: let us build orchestration incrementally without touching the frontend.

### Option A (strict): narrator always runs

- Orchestrator exists (can be LLM-based) but for now it always selects `narration`.
- Pros: simplest, UI unchanged, no “blank response” cases.
- Cons: doesn’t exercise non-narration flows.

### Option B (pragmatic): non-narration returns a short placeholder

- If orchestrator selects `faction_turn` or `world_building`, return an assistant text like:
  - `"(v2 stub) World builder would run here."`
- Pros: validates routing end-to-end.
- Cons: player-facing text may be confusing; still no spinner.

### Spinner idea (later)

- A true spinner requires a UI change.
- If we want _minimal_ UI change later, we can add a “status part” renderer (or reuse tool parts) so the backend can emit progress.

## Testing strategy (make probabilistic systems testable)

We won’t try to unit-test “good storytelling”. We test deterministic surfaces.

### 1) Tool unit tests (pure side-effects and validation)

- `twist_of_fate`: parsing/validation of ranges (pure)
- `edit_file`: uniqueness constraint (deterministic)
- `write_file`: writes under `GAME_FILES_DIR` (use a temp dir in tests)
- `create_image`: mock the BFL network call, then assert filesystem + DB insert + markdown append

### 2) Orchestrator routing tests

- Given a message and minimal context, assert chosen `sequence`.
- Even if the orchestrator is LLM-based, we can test the wrapper by injecting a fake model response.

### 3) Prompt assembly snapshot tests

- Snapshot the exact `system` string and the constructed model messages (including `# Game Context` injection).
- This catches regressions without caring about model output.

### 4) Make randomness injectable

- For dice (`twist_of_fate`), allow injecting an RNG in tests so outcomes are deterministic.

### 5) Fake model gateway for agent tests

Design rule for v2: every agent should depend on a small “model gateway” interface.

- Production: uses Anthropic via AI SDK (`generateText` / `streamText`).
- Tests: a `FakeModelGateway` returns canned outputs.

This lets us test orchestration flows (which agents get called, in what order, with what inputs) without paying for API calls or relying on probabilistic completions.

## Proposed incremental milestones

### Milestone 0 — “Seams only” (no behavior change)

- Create internal modules for:
  - context building
  - model gateway
  - tool wiring
- `/api/chat` still calls the old path.

### Milestone 1 — `/api/chat2` exists (still effectively v1)

- Add `/api/chat2` that streams narrator using the same tools.
- Validate it works via manual calls (curl / dev UI toggle later).

### Milestone 2 — Orchestrator decision layer

- Add orchestrator module with a structured output.
- Start deterministic (regex) or LLM-based, but keep behavior equivalent (choose narration).

### Milestone 3 — Archivist + Image Manager (post-stream)

- After narration finishes, run:
  - Archivist (writes/edits game files)
  - Image manager (search/generate)

### Milestone 4 — Faction turns and world builder

- Implement `faction_turn` and `world_building` sequences.
- Decide how the player learns about non-narration outputs (may require minimal UI affordance).
