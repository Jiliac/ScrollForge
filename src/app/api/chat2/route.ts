import { type UIMessage } from "ai";
import { loadGameContext } from "@/lib/game-files";
import { ensureConversationExists } from "@/lib/conversations";
import { tools } from "../chat/tools";
import { runOrchestrator } from "@/agents/orchestrator";
import { runWorldBuildStub } from "@/agents/world-builder";
import { runFactionTurnStub } from "@/agents/faction-turn";
import { runNarrator } from "@/agents/narrator";

// Allow streaming responses up to 60 seconds.
export const maxDuration = 60;

export async function POST(req: Request) {
  const {
    messages,
    conversationId,
  }: { messages: UIMessage[]; conversationId: string } = await req.json();

  await ensureConversationExists(conversationId);

  const { system: gameSystem, context } = await loadGameContext();

  const contextMessage: UIMessage | null = context
    ? {
        id: "game-context",
        role: "user",
        parts: [{ type: "text", text: `# Game Context\n\n${context}` }],
      }
    : null;

  const allMessages = contextMessage ? [contextMessage, ...messages] : messages;

  const decision = await runOrchestrator({
    gameSystem,
    messages: allMessages,
  });

  let preStepSummary: string | undefined;

  if (decision.preStep === "world_build") {
    const res = await runWorldBuildStub();
    preStepSummary = res.summary;
  } else if (decision.preStep === "faction_turn") {
    const res = await runFactionTurnStub();
    preStepSummary = res.summary;
  }

  const result = await runNarrator({
    gameSystem,
    messages: allMessages,
    tools,
    preStepSummary,
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return {
          conversationId,
          orchestrator: {
            preStep: decision.preStep,
            reason: decision.reason,
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
}
