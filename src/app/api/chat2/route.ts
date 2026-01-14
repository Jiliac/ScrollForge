import { type UIMessage } from "ai";
import { loadGameContext, getCurrentGameId } from "@/lib/game-files";
import { loadGameConfig } from "@/lib/game-config";
import { ensureConversationExists } from "@/lib/conversations";
import { tools } from "../chat/tools";
import { runOrchestrator } from "@/agents/orchestrator";
import { runWorldAdvance } from "@/agents/world-builder";
import { runFactionTurn } from "@/agents/faction-turn";
import { runNarrator } from "@/agents/narrator";
import { getSystemPrompt } from "@/agents/prompts";
import type { PreStep } from "@/agents/types";
import { isZepEnabled, addMessageToZep } from "@/lib/zep";

const RECENT_MESSAGE_COUNT = 8;

// Allow streaming responses up to 60 seconds.
export const maxDuration = 60;

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

type ChatRequestBody = {
  messages: UIMessage[];
  conversationId: string;
};

function validateRequestBody(
  body: unknown,
):
  | { success: true; data: ChatRequestBody }
  | { success: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }

  const { messages, conversationId } = body as Record<string, unknown>;

  if (!conversationId || typeof conversationId !== "string") {
    return { success: false, error: "Missing or invalid conversationId" };
  }

  if (!messages || !Array.isArray(messages)) {
    return { success: false, error: "Missing or invalid messages" };
  }

  return {
    success: true,
    data: { messages: messages as UIMessage[], conversationId },
  };
}

async function executePreSteps(
  preSteps: PreStep[],
  context: string,
  conversationId: string,
): Promise<string | undefined> {
  const results: string[] = [];

  for (const step of preSteps) {
    try {
      if (step.type === "world_advance") {
        const res = await runWorldAdvance(step, context, conversationId);
        results.push(`[World Advance: ${step.description}] ${res.summary}`);
      } else if (step.type === "faction_turn") {
        const res = await runFactionTurn(step, context, conversationId);
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

function buildContextMessage(context: string): UIMessage {
  return {
    id: "game-context",
    role: "user",
    parts: [{ type: "text", text: `# Game Context\n\n${context}` }],
  };
}

function buildZepContextMessage(context: string): UIMessage {
  return {
    id: "zep-context",
    role: "user",
    parts: [{ type: "text", text: `# Memory Context\n\n${context}` }],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = validateRequestBody(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages, conversationId } = validation.data;

    await ensureConversationExists(conversationId);

    const [config, gameId, gameFileContext] = await Promise.all([
      loadGameConfig(),
      getCurrentGameId(),
      loadGameContext(),
    ]);

    const gameSystem = getSystemPrompt(config);
    const recentMessages = messages.slice(-RECENT_MESSAGE_COUNT);

    // Orchestrator uses game files context
    const orchestratorMessages: UIMessage[] = gameFileContext
      ? [buildContextMessage(gameFileContext), ...recentMessages]
      : recentMessages;

    const decision = await runOrchestrator({
      gameSystem,
      messages: orchestratorMessages,
      conversationId,
    });

    // Pre-steps (world_advance, faction_turn) use game files context
    const preStepSummary = gameFileContext
      ? await executePreSteps(
          decision.preSteps,
          gameFileContext,
          conversationId,
        )
      : undefined;

    // Add user message to Zep and get memory context for narrator
    let zepContext: string | null = null;
    const latestUserMessage = messages.findLast((m) => m.role === "user");
    if (isZepEnabled() && latestUserMessage) {
      zepContext =
        (await addMessageToZep(
          gameId,
          conversationId,
          latestUserMessage,
          true,
        )) ?? null;
    }

    // Narrator uses Zep context (falls back to game files)
    const narratorContextMessages: UIMessage[] = [];
    if (zepContext) {
      narratorContextMessages.push(buildZepContextMessage(zepContext));
    } else if (gameFileContext) {
      narratorContextMessages.push(buildContextMessage(gameFileContext));
    }
    const narratorMessages = [...narratorContextMessages, ...recentMessages];

    const result = await runNarrator({
      gameSystem,
      messages: narratorMessages,
      tools,
      preStepSummary,
      suggestedTwists: decision.suggestedTwists,
      conversationId,
    });

    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          return {
            conversationId,
            orchestrator: {
              preSteps: decision.preSteps,
              suggestedTwists: decision.suggestedTwists,
              // Only expose reasoning in development (may leak system prompt details)
              ...(isDev() && { reasoning: decision.reasoning }),
            },
            context: {
              source: zepContext ? "zep" : gameFileContext ? "files" : "none",
              length: (zepContext ?? gameFileContext)?.length ?? 0,
              // Full zepContext for frontend to pass to messages route
              zepContext: zepContext ?? undefined,
              // Only expose preview in development for debugging
              ...(isDev() && {
                preview: (zepContext ?? gameFileContext)?.slice(0, 500),
              }),
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
        // Only expose error details in development
        ...(isDev() && {
          message: error instanceof Error ? error.message : "Unknown error",
        }),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
