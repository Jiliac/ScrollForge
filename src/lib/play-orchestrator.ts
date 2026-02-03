import { createUIMessageStream, type UIMessage } from "ai";
import { loadGameContext } from "@/lib/game-files";
import { loadGameConfig } from "@/lib/game-config";
import { ensureConversationExists } from "@/lib/conversations";
import { createNarratorTools } from "@/app/api/chat/tools";
import { runOrchestrator } from "@/agents/orchestrator";
import { runWorldAdvance } from "@/agents/world-builder";
import { runFactionTurn } from "@/agents/faction-turn";
import { runNarrator } from "@/agents/narrator";
import { runArchivist } from "@/agents/archivist";
import { getSystemPrompt } from "@/agents/prompts";
import type { PreStep, OrchestratorDecision } from "@/agents/types";
import { streamToUI } from "@/lib/stream-to-ui";

export type StreamWriter = Parameters<
  Parameters<typeof createUIMessageStream>[0]["execute"]
>[0]["writer"];

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

export async function executePlayStream(
  writer: StreamWriter,
  {
    messages,
    conversationId,
    userId,
    gameId,
  }: {
    messages: UIMessage[];
    conversationId: string;
    userId: string;
    gameId: string;
  },
): Promise<void> {
  try {
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
    writer.write({ type: "finish-step" });
  }
}
