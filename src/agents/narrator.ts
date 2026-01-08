import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";

export async function runNarrator(opts: {
  gameSystem: string;
  messages: UIMessage[];
  tools: ToolSet;
  preStepSummary?: string;
}) {
  const extra = opts.preStepSummary
    ? `\n\n# Internal Pre-step Summary (do not mention this heading)\n${opts.preStepSummary}`
    : "";

  return streamText({
    model: openai("gpt-5.2"),
    system: (opts.gameSystem || "") + extra || undefined,
    messages: await convertToModelMessages(opts.messages),
    tools: opts.tools,
    stopWhen: stepCountIs(20),
  });
}
