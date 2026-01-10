import { type UIMessage } from "ai";
import { loadGameContext } from "@/lib/game-files";
import { loadGameConfig } from "@/lib/game-config";
import { ensureConversationExists } from "@/lib/conversations";
import { tools } from "../chat/tools";
import { runOrchestrator } from "@/agents/orchestrator";
import { runWorldAdvance } from "@/agents/world-builder";
import { runFactionTurn } from "@/agents/faction-turn";
import { runNarrator } from "@/agents/narrator";
import { getSystemPrompt } from "@/agents/prompts";
import type { PreStep } from "@/agents/types";

// Allow streaming responses up to 60 seconds.
export const maxDuration = 60;

async function executePreSteps(
  preSteps: PreStep[],
  context: string,
): Promise<string | undefined> {
  const results: string[] = [];

  for (const step of preSteps) {
    if (step.type === "world_advance") {
      const res = await runWorldAdvance(step, context);
      results.push(`[World Advance: ${step.description}] ${res.summary}`);
    } else if (step.type === "faction_turn") {
      const res = await runFactionTurn(step, context);
      results.push(`[${step.faction}] ${res.summary}`);
    }
  }

  return results.length > 0 ? results.join("\n\n") : undefined;
}

function buildContextMessage(context: string): UIMessage {
  return {
    id: "game-context",
    role: "user",
    parts: [{ type: "text", text: `# Game Context\n\n${context}` }],
  };
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      conversationId,
    }: { messages: UIMessage[]; conversationId: string } = await req.json();

    await ensureConversationExists(conversationId);

    const [config, context] = await Promise.all([
      loadGameConfig(),
      loadGameContext(),
    ]);

    const gameSystem = getSystemPrompt(config);
    const allMessages = context
      ? [buildContextMessage(context), ...messages]
      : messages;

    const decision = await runOrchestrator({
      gameSystem,
      messages: allMessages,
    });
    const preStepSummary = await executePreSteps(decision.preSteps, context);

    const result = await runNarrator({
      gameSystem,
      messages: allMessages,
      tools,
      preStepSummary,
      suggestedTwists: decision.suggestedTwists,
    });

    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          return {
            conversationId,
            orchestrator: {
              preSteps: decision.preSteps,
              suggestedTwists: decision.suggestedTwists,
              reasoning: decision.reasoning,
            },
            usage: {
              inputTokens: part.totalUsage.inputTokens,
              outputTokens: part.totalUsage.outputTokens,
              totalTokens: part.totalUsage.totalTokens,
            },
          };
        }
      },
    });
  } catch (error) {
    console.error("Error in /api/chat2:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
