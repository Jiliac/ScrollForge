import { type UIMessage } from "ai";
import { loadGameContext } from "@/lib/game-files";
import { loadGameConfig } from "@/lib/game-config";
import { ensureConversationExists } from "@/lib/conversations";
import { tools } from "../chat/tools";
import { runOrchestrator } from "@/agents/orchestrator";
import { runWorldAdvanceStub } from "@/agents/world-builder";
import { runFactionTurnStub } from "@/agents/faction-turn";
import { runNarrator } from "@/agents/narrator";
import { getSystemPrompt } from "@/agents/prompts";

// Allow streaming responses up to 60 seconds.
export const maxDuration = 60;

export async function POST(req: Request) {
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

  // Run all pre-steps and collect summaries
  const preStepResults: string[] = [];

  for (const step of decision.preSteps) {
    if (step.type === "world_advance") {
      const res = await runWorldAdvanceStub(step);
      preStepResults.push(
        `[World Advance: ${step.description}] ${res.summary}`,
      );
    } else if (step.type === "faction_turn") {
      const res = await runFactionTurnStub(step);
      preStepResults.push(`[${step.faction}] ${res.summary}`);
    }
  }

  const preStepSummary =
    preStepResults.length > 0 ? preStepResults.join("\n\n") : undefined;

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
}
