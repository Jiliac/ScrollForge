import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";
import type { SuggestedTwist } from "./types";
import { startAgentLog, completeAgentLog } from "@/lib/agent-logs";

function buildOrchestratorContext(
  preStepSummary?: string,
  suggestedTwists?: SuggestedTwist[],
): UIMessage | null {
  const parts: string[] = [];

  if (preStepSummary) {
    parts.push(`# What Happened Off-Screen\n${preStepSummary}`);
  }

  if (suggestedTwists && suggestedTwists.length > 0) {
    const twistLines = suggestedTwists
      .map((t) => `- ${t.situation} (${t.reason})`)
      .join("\n");
    parts.push(
      `# Suggested Dice Rolls\nConsider using twist_of_fate for these uncertain situations:\n${twistLines}`,
    );
  }

  if (parts.length === 0) return null;

  return {
    id: "orchestrator-context",
    role: "user",
    parts: [{ type: "text", text: parts.join("\n\n") }],
  };
}

export async function runNarrator(opts: {
  gameSystem: string;
  messages: UIMessage[];
  tools: ToolSet;
  preStepSummary?: string;
  suggestedTwists?: SuggestedTwist[];
  conversationId?: string;
}) {
  const logId = opts.conversationId
    ? await startAgentLog(opts.conversationId, "narrator", {
        messageCount: opts.messages.length,
        hasPreStepSummary: !!opts.preStepSummary,
        suggestedTwistsCount: opts.suggestedTwists?.length ?? 0,
      })
    : null;

  const orchestratorContext = buildOrchestratorContext(
    opts.preStepSummary,
    opts.suggestedTwists,
  );

  // Insert orchestrator context before the last user message
  const messages = orchestratorContext
    ? [
        ...opts.messages.slice(0, -1),
        orchestratorContext,
        opts.messages.at(-1)!,
      ]
    : opts.messages;

  const result = streamText({
    model: openai("gpt-5.2"),
    system: opts.gameSystem || undefined,
    messages: await convertToModelMessages(messages),
    tools: opts.tools,
    stopWhen: stepCountIs(20),
    onFinish: logId
      ? async () => {
          // Log completion when streaming finishes
          await completeAgentLog(logId, { streamed: true });
        }
      : undefined,
  });

  return result;
}
