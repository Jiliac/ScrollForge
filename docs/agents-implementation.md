# Agents Implementation Guide

Implementation details for the multi-agent architecture using Vercel AI SDK.

## Why No Framework

Evaluated options:

| Option                  | Verdict                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CrewAI**              | Python-only, designed for autonomous crews that decide their own flow. Our sequences are code-controlled. Reports of hitting walls 6-12 months in. |
| **Anthropic Agent SDK** | Built for Claude Code-style agents (file editing, commands). Overkill for narrative agents.                                                        |
| **LangGraph/LangChain** | Overly complex, poor DX.                                                                                                                           |
| **Vercel AI SDK**       | Already using it. Has all needed primitives.                                                                                                       |

**Decision**: Manual coding with Vercel AI SDK. Agents are functions, sequences are TypeScript orchestration.

---

## AI SDK Patterns We Use

| Our Design            | AI SDK Pattern                                 |
| --------------------- | ---------------------------------------------- |
| Orchestrator          | Routing — classify input, dispatch to sequence |
| Narration Sequence    | Sequential + Parallel                          |
| Faction Turn Sequence | Orchestrator-Worker                            |
| Individual Agents     | `generateText` / `streamText` with tools       |
| Criticizer (future)   | Evaluator-Optimizer loop                       |

---

## File Structure

```text
src/
├── agents/
│   ├── types.ts              # Shared types
│   ├── context.ts            # Context management
│   ├── orchestrator.ts       # Main dispatcher
│   ├── narrator.ts           # Player-facing storyteller
│   ├── faction.ts            # Faction agent
│   ├── archivist.ts          # File writer
│   ├── image-manager.ts      # Image operations
│   └── world-builder.ts      # Content creation (future)
├── sequences/
│   ├── narration.ts          # Narration sequence
│   └── faction-turn.ts       # Faction turn sequence
└── app/api/chat/
    └── route.ts              # Entry point (calls orchestrator)
```

---

## Core Types

```typescript
// src/agents/types.ts

import type { UIMessage } from "ai";

export interface GameContext {
  conversationId: string;
  messages: UIMessage[];
  files: string[]; // Paths to relevant game files
  additionalContext: string; // Append-only prose
  currentLocation?: string;
  recentNPCs?: string[];
  inGameDate?: string;
}

export interface AgentResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface NarrationResult extends AgentResult {
  response: AsyncIterable<string>; // Streamed to player
  toolCalls?: Array<{
    tool: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
}

export interface FactionResult extends AgentResult {
  faction: string;
  decision: string;
  reasoning?: string;
}

export interface ArchivistResult extends AgentResult {
  filesUpdated: string[];
  contextAppended?: string;
}
```

---

## Context Management

```typescript
// src/agents/context.ts

import { prisma } from "@/lib/prisma";
import { loadGameContext } from "@/lib/game-files";
import type { GameContext } from "./types";

// DB Schema addition needed:
// model ConversationContext {
//   id                String   @id @default(cuid())
//   conversationId    String   @unique
//   files             String   // JSON array of file paths
//   additionalContext String   @db.Text
//   createdAt         DateTime @default(now())
//   updatedAt         DateTime @updatedAt
// }

export async function loadContext(
  conversationId: string,
): Promise<GameContext> {
  // Load from DB if exists
  const stored = await prisma.conversationContext.findUnique({
    where: { conversationId },
  });

  if (stored) {
    return {
      conversationId,
      messages: [], // Loaded separately
      files: JSON.parse(stored.files),
      additionalContext: stored.additionalContext,
    };
  }

  // First time: initialize with full context compression
  return initializeContext(conversationId);
}

async function initializeContext(conversationId: string): Promise<GameContext> {
  const { system, context } = await loadGameContext();

  // One-time compression call: "What's relevant?"
  // For now, just include everything (50k tokens is fine)
  const allFiles = await getAllGameFilePaths();

  const initialContext: GameContext = {
    conversationId,
    messages: [],
    files: allFiles,
    additionalContext: "",
  };

  // Persist
  await prisma.conversationContext.create({
    data: {
      conversationId,
      files: JSON.stringify(allFiles),
      additionalContext: "",
    },
  });

  return initialContext;
}

export async function appendToContext(
  conversationId: string,
  update: {
    addFiles?: string[];
    appendText?: string;
  },
): Promise<void> {
  const current = await prisma.conversationContext.findUnique({
    where: { conversationId },
  });

  if (!current) return;

  const files = JSON.parse(current.files) as string[];
  const newFiles = update.addFiles
    ? [...new Set([...files, ...update.addFiles])]
    : files;

  const newContext = update.appendText
    ? current.additionalContext + "\n" + update.appendText
    : current.additionalContext;

  await prisma.conversationContext.update({
    where: { conversationId },
    data: {
      files: JSON.stringify(newFiles),
      additionalContext: newContext,
    },
  });
}
```

---

## Orchestrator

```typescript
// src/agents/orchestrator.ts

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { narrationSequence } from "@/sequences/narration";
import { factionTurnSequence } from "@/sequences/faction-turn";
import type { GameContext } from "./types";

type SequenceType = "narration" | "faction_turn" | "world_building";

export async function orchestrate(
  context: GameContext,
  playerMessage: string,
): Promise<{ sequence: SequenceType; result: unknown }> {
  // Simple routing: check for explicit triggers first
  if (isTimeSkipRequest(playerMessage)) {
    const result = await factionTurnSequence(context, playerMessage);
    return { sequence: "faction_turn", result };
  }

  // Default: narration sequence
  const result = await narrationSequence(context, playerMessage);
  return { sequence: "narration", result };
}

function isTimeSkipRequest(message: string): boolean {
  const timeSkipPatterns = [
    /skip (to|ahead|forward)/i,
    /advance \d+ (days?|weeks?|months?)/i,
    /what happens? (while|when) I/i,
    /pass(es)? time/i,
    /wait until/i,
  ];
  return timeSkipPatterns.some((p) => p.test(message));
}

// Future: LLM-based routing for ambiguous cases
async function classifyIntent(message: string): Promise<SequenceType> {
  const { object } = await generateObject({
    model: anthropic("claude-haiku-3"),
    schema: z.object({
      intent: z.enum(["narration", "faction_turn", "world_building"]),
    }),
    prompt: `Classify player intent: "${message}"`,
  });
  return object.intent;
}
```

---

## Narrator Agent

```typescript
// src/agents/narrator.ts

import { streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { twistOfFateTool } from "@/app/api/chat/tools/twist-of-fate";
import { factionAgent } from "./faction";
import type { GameContext, NarrationResult } from "./types";

const NARRATOR_SYSTEM = `You are the Narrator for a text-based RPG set in the 11th century Islamic world.

Your role:
- Narrate scenes with rich sensory detail
- Voice NPCs in dialogue (surface level)
- Present choices and consequences
- Use twist_of_fate for uncertain outcomes
- Call think_as_faction when an NPC needs to make a consequential decision

You do NOT:
- Write to files (Archivist does this)
- Manage images (Image Manager does this)
- Simply accommodate player wishes — the world pushes back

CORE DIRECTIVE: You are an impartial arbiter, not a wish-fulfillment engine.`;

export async function narratorAgent(
  context: GameContext,
  playerMessage: string,
): Promise<NarrationResult> {
  const contextContent = await buildContextContent(context);

  const result = streamText({
    model: anthropic("claude-opus-4-5-20251101"),
    system: NARRATOR_SYSTEM + "\n\n" + contextContent,
    messages: [...context.messages, { role: "user", content: playerMessage }],
    tools: {
      twist_of_fate: twistOfFateTool,

      think_as_faction: tool({
        description: `Get a faction/NPC's decision on a situation.
Use when an NPC needs to make a consequential choice that should reflect their goals.
The faction will respond pursuing their own interests, not the player's convenience.`,
        inputSchema: z.object({
          faction: z
            .string()
            .describe(
              "Faction or NPC name (e.g., 'Mahmud-Tabari', 'Sarraf Network')",
            ),
          situation: z
            .string()
            .describe("Current situation requiring a decision"),
          question: z.string().describe("What decision or action is needed?"),
        }),
        execute: async ({ faction, situation, question }) => {
          const factionResult = await factionAgent(context, {
            faction,
            situation,
            question,
          });
          return {
            faction,
            decision: factionResult.decision,
            reasoning: factionResult.reasoning,
          };
        },
      }),
    },
    maxSteps: 10,
  });

  return {
    success: true,
    response: result.textStream,
  };
}

async function buildContextContent(context: GameContext): Promise<string> {
  // Load relevant files and combine with additional context
  const fileContents = await loadFilesContent(context.files);
  return `# Game Context\n\n${fileContents}\n\n# Session Notes\n\n${context.additionalContext}`;
}
```

---

## Faction Agent

```typescript
// src/agents/faction.ts

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { GameContext, FactionResult } from "./types";

interface FactionQuery {
  faction: string;
  situation: string;
  question: string;
}

const FACTION_SYSTEM = `You are playing a faction/NPC in an 11th century Islamic world RPG.

Your ONLY job: decide what this faction does, pursuing THEIR goals.

Rules:
- You have your own interests. You don't exist to help the player.
- Consider: What's in it for you? What do you risk? What do you want?
- You may refuse, demand payment, set conditions, or act against the player.
- Never volunteer information you wouldn't logically share.
- If the player's request conflicts with your goals, prioritize YOUR goals.

Respond with:
1. Your decision/action
2. Brief reasoning (from faction's perspective)`;

export async function factionAgent(
  context: GameContext,
  query: FactionQuery,
): Promise<FactionResult> {
  // Load faction-specific context
  const factionContext = await loadFactionContext(query.faction, context);

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: FACTION_SYSTEM + "\n\n" + factionContext,
    prompt: `Faction: ${query.faction}
Situation: ${query.situation}
Question: ${query.question}

What do you decide/do?`,
  });

  // Parse response (simple for now)
  const [decision, ...reasoningParts] = text.split("\n\n");

  return {
    success: true,
    faction: query.faction,
    decision: decision.replace(/^(Decision|Action):\s*/i, ""),
    reasoning: reasoningParts.join("\n\n"),
  };
}

async function loadFactionContext(
  faction: string,
  context: GameContext,
): Promise<string> {
  // Find faction's file in context
  const factionFile = context.files.find((f) =>
    f.toLowerCase().includes(faction.toLowerCase().replace(/-/g, "")),
  );

  if (factionFile) {
    const content = await loadFileContent(factionFile);
    return `# ${faction}\n\n${content}`;
  }

  return `# ${faction}\n\n(No detailed information available)`;
}
```

---

## Archivist Agent

```typescript
// src/agents/archivist.ts

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { writeFileTool } from "@/app/api/chat/tools/write-file";
import { editFileTool } from "@/app/api/chat/tools/edit-file";
import { appendToContext } from "./context";
import type { GameContext, ArchivistResult } from "./types";

const ARCHIVIST_SYSTEM = `You are the Archivist for an RPG. Your job: update game files to reflect what happened.

You receive a summary of events and must:
1. Update relevant NPC files if relationships/states changed
2. Update location files if places changed
3. Update threads.md if threads advanced or new threads emerged
4. Write session log entries

Be concise. Only record meaningful changes. Don't duplicate information.`;

interface ArchivistInput {
  events: string; // What happened
  rollResults?: string[]; // Any twist_of_fate results
  npcInteractions?: string[];
}

export async function archivistAgent(
  context: GameContext,
  input: ArchivistInput,
): Promise<ArchivistResult> {
  const { text } = await generateText({
    model: anthropic("claude-haiku-3"),
    system: ARCHIVIST_SYSTEM,
    tools: {
      write_file: writeFileTool,
      edit_file: editFileTool,
    },
    maxSteps: 5,
    prompt: `Events to record:
${input.events}

${input.rollResults?.length ? `Roll results:\n${input.rollResults.join("\n")}` : ""}
${input.npcInteractions?.length ? `NPCs involved:\n${input.npcInteractions.join(", ")}` : ""}

Update the relevant game files.`,
  });

  // Also append to conversation context
  if (input.events) {
    await appendToContext(context.conversationId, {
      appendText: `[${new Date().toISOString()}] ${input.events}`,
    });
  }

  return {
    success: true,
    filesUpdated: [], // TODO: extract from tool calls
  };
}
```

---

## Image Manager Agent

```typescript
// src/agents/image-manager.ts

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { searchImageTool } from "@/app/api/chat/tools/search-image";
import { createImageTool } from "@/app/api/chat/tools/create-image";
import type { GameContext } from "./types";

const IMAGE_MANAGER_SYSTEM = `You manage visuals for an RPG set in the 11th century Islamic world.

Given a scene, decide:
1. Search for existing images that could illustrate it
2. If none found and scene is significant, generate a new image

Prioritize:
- NPC portraits when they appear
- Dramatic moments
- New locations

Don't generate images for:
- Routine scenes
- Repeated locations (search instead)
- Abstract concepts`;

interface ImageInput {
  scene: string;
  npcsPresent?: string[];
  location?: string;
}

export async function imageManagerAgent(
  context: GameContext,
  input: ImageInput,
): Promise<{ imagePath?: string }> {
  const { text, toolCalls } = await generateText({
    model: anthropic("claude-haiku-3"),
    system: IMAGE_MANAGER_SYSTEM,
    tools: {
      search_image: searchImageTool,
      create_image: createImageTool,
    },
    maxSteps: 3,
    prompt: `Scene: ${input.scene}
${input.npcsPresent?.length ? `NPCs present: ${input.npcsPresent.join(", ")}` : ""}
${input.location ? `Location: ${input.location}` : ""}

Find or create an appropriate image.`,
  });

  // Extract image path from tool results
  const imageResult = toolCalls?.find(
    (tc) => tc.toolName === "search_image" || tc.toolName === "create_image",
  );

  return {
    imagePath: imageResult?.result?.path,
  };
}
```

---

## Narration Sequence

```typescript
// src/sequences/narration.ts

import { narratorAgent } from "@/agents/narrator";
import { archivistAgent } from "@/agents/archivist";
import { imageManagerAgent } from "@/agents/image-manager";
import type { GameContext } from "@/agents/types";

export async function narrationSequence(
  context: GameContext,
  playerMessage: string,
) {
  // 1. Run narrator (streams to player)
  const narratorResult = await narratorAgent(context, playerMessage);

  // Collect full response for post-processing
  let fullResponse = "";
  const toolCalls: unknown[] = [];

  for await (const chunk of narratorResult.response) {
    fullResponse += chunk;
    // Stream chunk to player here
  }

  // 2. Post-processing in parallel (non-blocking for player)
  const postProcess = async () => {
    await Promise.all([
      archivistAgent(context, {
        events: summarizeForArchivist(fullResponse, playerMessage),
        // TODO: extract roll results and NPC interactions
      }),
      imageManagerAgent(context, {
        scene: fullResponse,
        // TODO: extract NPCs and location
      }),
    ]);
  };

  // Fire and forget post-processing
  postProcess().catch(console.error);

  return narratorResult;
}

function summarizeForArchivist(response: string, playerAction: string): string {
  // Simple summary for now
  return `Player: ${playerAction.slice(0, 100)}...\nResponse: ${response.slice(0, 200)}...`;
}
```

---

## Faction Turn Sequence

```typescript
// src/sequences/faction-turn.ts

import { factionAgent } from "@/agents/faction";
import { archivistAgent } from "@/agents/archivist";
import type { GameContext } from "@/agents/types";

interface FactionTurnResult {
  factionActions: Array<{
    faction: string;
    action: string;
  }>;
  summary: string;
}

export async function factionTurnSequence(
  context: GameContext,
  timeSkipRequest: string,
): Promise<FactionTurnResult> {
  // 1. Select factions to advance
  const factions = selectFactions(context);

  // 2. Run faction agents in parallel
  const factionResults = await Promise.all(
    factions.map((faction) =>
      factionAgent(context, {
        faction,
        situation: `Time has passed. ${timeSkipRequest}`,
        question:
          "What does your faction do during this time to advance your goals?",
      }),
    ),
  );

  // 3. Archive results
  const summary = factionResults
    .map((r) => `${r.faction}: ${r.decision}`)
    .join("\n");

  await archivistAgent(context, {
    events: `FACTION TURN\n${summary}`,
  });

  return {
    factionActions: factionResults.map((r) => ({
      faction: r.faction,
      action: r.decision,
    })),
    summary,
  };
}

function selectFactions(context: GameContext): string[] {
  // TODO: Implement proper selection logic
  // - 2 factions player recently interacted with
  // - 1 faction player hasn't touched

  // For now, return hardcoded factions
  return ["Mahmud-Tabari", "Sarraf Network", "Guild Council"];
}
```

---

## Updated API Route

```typescript
// src/app/api/chat/route.ts

import { anthropic } from "@ai-sdk/anthropic";
import { type UIMessage } from "ai";
import { orchestrate } from "@/agents/orchestrator";
import { loadContext } from "@/agents/context";
import { ensureConversationExists } from "@/lib/conversations";

export async function POST(req: Request) {
  const {
    messages,
    conversationId,
  }: { messages: UIMessage[]; conversationId: string } = await req.json();

  await ensureConversationExists(conversationId);

  // Load context for this conversation
  const context = await loadContext(conversationId);
  context.messages = messages;

  // Get player's latest message
  const playerMessage = messages[messages.length - 1];
  const playerText = playerMessage.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");

  // Orchestrate the response
  const { sequence, result } = await orchestrate(context, playerText);

  // Return streamed response
  // TODO: adapt based on sequence type
  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return {
          conversationId,
          sequence,
          usage: {
            inputTokens: part.totalUsage.inputTokens,
            outputTokens: part.totalUsage.outputTokens,
            totalTokens: part.totalUsage.totalTokens,
          },
        };
      }
    },
  });
}
```

---

## Migration Steps

### Phase 1: Foundation

1. Add `ConversationContext` to Prisma schema
2. Implement `src/agents/context.ts`
3. Implement `src/agents/types.ts`

### Phase 2: Extract Agents

4. Create `src/agents/narrator.ts` — extract from current route.ts
5. Create `src/agents/archivist.ts` — extract file writing
6. Create `src/agents/image-manager.ts` — extract image tools
7. Update route.ts to use narrator agent

### Phase 3: Add Orchestration

8. Create `src/agents/faction.ts`
9. Add `think_as_faction` tool to narrator
10. Create `src/sequences/narration.ts`
11. Create `src/agents/orchestrator.ts`

### Phase 4: Faction Turns

12. Create `src/sequences/faction-turn.ts`
13. Add time skip detection to orchestrator
14. Implement faction selection logic

### Phase 5: Polish

15. Add NPC goals to game files
16. Implement proper context summarization
17. Add Criticizer agent (optional)
