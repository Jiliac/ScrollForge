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
import { isZepEnabled, syncMessagesToZep } from "@/lib/zep";

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

    const [config, context, gameId] = await Promise.all([
      loadGameConfig(),
      loadGameContext(),
      getCurrentGameId(),
    ]);

    // Sync messages to Zep and get context (if enabled)
    let zepContext: string | undefined;
    if (isZepEnabled()) {
      zepContext = await syncMessagesToZep(
        gameId,
        conversationId,
        messages,
        true, // returnContext
      );
    }

    const gameSystem = getSystemPrompt(config);

    // Build message array: game context + zep context + recent messages
    const recentMessages = messages.slice(-RECENT_MESSAGE_COUNT);
    const contextMessages: UIMessage[] = [];
    if (context) {
      contextMessages.push(buildContextMessage(context));
    }
    if (zepContext) {
      contextMessages.push(buildZepContextMessage(zepContext));
    }
    const allMessages = [...contextMessages, ...recentMessages];

    const decision = await runOrchestrator({
      gameSystem,
      messages: allMessages,
      conversationId,
    });

    // Only execute pre-steps if we have context (pre-step agents need it)
    const preStepSummary = context
      ? await executePreSteps(decision.preSteps, context, conversationId)
      : undefined;

    const result = await runNarrator({
      gameSystem,
      messages: allMessages,
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
            zep: {
              enabled: isZepEnabled(),
              contextLength: zepContext?.length ?? 0,
              // Only expose context preview in development
              ...(isDev() && {
                contextPreview: zepContext?.slice(0, 500),
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
