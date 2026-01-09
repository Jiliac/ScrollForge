import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";
import type { SuggestedTwist } from "./types";

export async function runNarrator(opts: {
  gameSystem: string;
  messages: UIMessage[];
  tools: ToolSet;
  preStepSummary?: string;
  suggestedTwists?: SuggestedTwist[];
}) {
  const parts: string[] = [];

  if (opts.preStepSummary) {
    parts.push(
      `# Internal Pre-step Summary (do not mention this heading)\n${opts.preStepSummary}`,
    );
  }

  if (opts.suggestedTwists && opts.suggestedTwists.length > 0) {
    const twistLines = opts.suggestedTwists
      .map((t) => `- ${t.situation} (${t.reason})`)
      .join("\n");
    parts.push(
      `# Suggested Dice Rolls\nConsider using twist_of_fate for these uncertain situations:\n${twistLines}`,
    );
  }

  const extra = parts.length > 0 ? "\n\n" + parts.join("\n\n") : "";

  return streamText({
    model: openai("gpt-5.2"),
    system: (opts.gameSystem || "") + extra || undefined,
    messages: await convertToModelMessages(opts.messages),
    tools: opts.tools,
    stopWhen: stepCountIs(20),
  });
}
