import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { getCurrentGame, loadGameContext } from "@/lib/game-files";
import { loadGameConfig } from "@/lib/game-config";
import { ensureConversationExists } from "@/lib/conversations";
import { requireUserId } from "@/lib/auth";
import { createNarratorTools } from "../chat/tools";
import { runOrchestrator } from "@/agents/orchestrator";
import { runWorldAdvance } from "@/agents/world-builder";
import { runFactionTurn } from "@/agents/faction-turn";
import { runNarrator } from "@/agents/narrator";
import { runArchivist } from "@/agents/archivist";
import { getSystemPrompt } from "@/agents/prompts";
import type { PreStep, OrchestratorDecision } from "@/agents/types";
import { streamToUI } from "@/lib/stream-to-ui";
import { validateRequestBody } from "@/lib/validate-chat-request";

// Allow streaming responses up to 60 seconds.
export const maxDuration = 60;

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function buildContextMessage(context: string): UIMessage {
  return {
    id: "game-context",
    role: "user",
    parts: [{ type: "text", text: `# Game Context\n\n${context}` }],
  };
}

function summarizeDecision(decision: OrchestratorDecision): string {
  const parts: string[] = [];
  const factionTurns = decision.preSteps.filter(
    (s) => s.type === "faction_turn",
  );
  const worldAdvances = decision.preSteps.filter(
    (s) => s.type === "world_advance",
  );

  if (factionTurns.length > 0) {
    parts.push(`${factionTurns.length} faction turn(s)`);
  }
  if (worldAdvances.length > 0) {
    parts.push(`${worldAdvances.length} world advance(s)`);
  }
  if (decision.suggestedTwists.length > 0) {
    parts.push(`${decision.suggestedTwists.length} suggested twist(s)`);
  }

  return parts.length > 0 ? parts.join(", ") : "Direct to narrator";
}

type StreamWriter = Parameters<
  Parameters<typeof createUIMessageStream>[0]["execute"]
>[0]["writer"];

async function executePreStepsWithProgress(
  preSteps: PreStep[],
  context: string,
  conversationId: string,
  gameId: string,
  writer: StreamWriter,
): Promise<string | undefined> {
  const results: string[] = [];

  for (const step of preSteps) {
    try {
      if (step.type === "world_advance") {
        writer.write({
          type: "data-agent-progress",
          data: {
            agent: "world_advance",
            status: "started",
            description: step.description,
          },
        });

        const res = await runWorldAdvance(
          step,
          context,
          conversationId,
          gameId,
        );

        writer.write({
          type: "data-agent-progress",
          data: {
            agent: "world_advance",
            status: "completed",
            description: step.description,
          },
        });

        results.push(`[World Advance: ${step.description}] ${res.summary}`);
      } else if (step.type === "faction_turn") {
        writer.write({
          type: "data-agent-progress",
          data: {
            agent: "faction_turn",
            status: "started",
            faction: step.faction,
          },
        });

        const res = await runFactionTurn(step, context, conversationId, gameId);

        writer.write({
          type: "data-agent-progress",
          data: {
            agent: "faction_turn",
            status: "completed",
            faction: step.faction,
          },
        });

        results.push(`[${step.faction}] ${res.summary}`);
      } else {
        console.warn("executePreSteps: unsupported preStep type", step);
      }
    } catch (err) {
      console.error("executePreSteps: failed preStep", step, err);
      results.push(`[PreStep Failed: ${step.type}]`);
    }
  }

  return results.length > 0 ? results.join("\n\n") : undefined;
}

export async function POST(req: Request) {
  // Parse and validate request body first (outside the stream)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validation = validateRequestBody(body);

  if (!validation.success) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, conversationId } = validation.data;

  const userId = await requireUserId();
  const game = await getCurrentGame(userId);
  const gameId = game.id;

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      try {
        // Start a single step for the entire response
        writer.write({ type: "start-step" });

        await ensureConversationExists(conversationId, userId, gameId);

        const [config, context] = await Promise.all([
          loadGameConfig(gameId),
          loadGameContext(gameId),
        ]);

        const gameSystem = getSystemPrompt(config);
        const allMessages = context
          ? [buildContextMessage(context), ...messages]
          : messages;

        // 1. Orchestrator
        writer.write({
          type: "data-agent-progress",
          data: { agent: "orchestrator", status: "started" },
        });

        const decision = await runOrchestrator({
          gameSystem,
          messages: allMessages,
          conversationId,
        });

        writer.write({
          type: "data-agent-progress",
          data: {
            agent: "orchestrator",
            status: "completed",
            preStepsCount: decision.preSteps.length,
            summary: summarizeDecision(decision),
          },
        });

        // 2. Pre-steps with progress events
        const preStepSummary = context
          ? await executePreStepsWithProgress(
              decision.preSteps,
              context,
              conversationId,
              gameId,
              writer,
            )
          : undefined;

        // 3. Narrator (no progress event - its output streams directly)
        const narratorTools = createNarratorTools(gameId);
        const result = await runNarrator({
          gameSystem,
          messages: allMessages,
          tools: narratorTools,
          preStepSummary,
          suggestedTwists: decision.suggestedTwists,
          conversationId,
        });

        // Stream narrator output to UI
        await streamToUI(result, writer);

        // Get narrator's full response text for archivist
        const narratorResponse = await result.text;

        // 4. Archivist (records session)
        // Note: Pass original messages, not allMessages - archivist prepends context itself
        if (context) {
          writer.write({
            type: "data-agent-progress",
            data: { agent: "archivist", status: "started" },
          });

          try {
            await runArchivist({
              context,
              messages,
              narratorResponse,
              conversationId,
              gameId,
            });

            writer.write({
              type: "data-agent-progress",
              data: { agent: "archivist", status: "completed" },
            });
          } catch (error) {
            // Don't let archivist errors break the already-streamed narrator response
            console.error("Archivist failed:", error);
            writer.write({
              type: "data-agent-progress",
              data: { agent: "archivist", status: "completed" },
            });
          }
        }

        // Write metadata at the end
        const usage = await result.usage;
        writer.write({
          type: "message-metadata",
          messageMetadata: {
            conversationId,
            orchestrator: {
              preSteps: decision.preSteps,
              suggestedTwists: decision.suggestedTwists,
              ...(isDev() && { reasoning: decision.reasoning }),
            },
            usage: {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              totalTokens: usage.totalTokens,
            },
          },
        });
      } catch (error) {
        console.error("Error in /api/play stream:", error);
        writer.write({
          type: "error",
          errorText: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        // Always end the step, even on error
        writer.write({ type: "finish-step" });
      }
    },
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });

  return createUIMessageStreamResponse({ stream });
}
