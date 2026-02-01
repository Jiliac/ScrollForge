import { defaultModel } from "@/lib/ai-model";
import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { getArchivistPrompt } from "./prompts";
import { loadGameConfig } from "@/lib/game-config";
import { createArchivistTools } from "@/app/api/chat/tools";
import {
  startAgentLog,
  completeAgentLog,
  failAgentLog,
} from "@/lib/agent-logs";
import { extractToolCalls } from "./extract-tool-calls";

export type ArchivistResult = {
  summary: string;
  sessionFile?: string;
  toolCalls: Array<{
    toolName: string;
    args: Record<string, unknown>;
  }>;
};

export async function runArchivist(opts: {
  context: string;
  messages: UIMessage[];
  narratorResponse: string;
  conversationId?: string;
  gameId: string;
}): Promise<ArchivistResult> {
  const logId = opts.conversationId
    ? await startAgentLog(opts.conversationId, "archivist", {
        narratorResponseLength: opts.narratorResponse.length,
        messageCount: opts.messages.length,
      })
    : null;

  try {
    const config = await loadGameConfig(opts.gameId);
    const systemPrompt = getArchivistPrompt(config, opts.narratorResponse);

    const tools = createArchivistTools(opts.gameId);

    const { text, steps } = await generateText({
      model: defaultModel,
      system: systemPrompt,
      messages: await convertToModelMessages([
        {
          id: "game-context",
          role: "user",
          parts: [{ type: "text", text: `# Game Context\n\n${opts.context}` }],
        },
        ...opts.messages,
      ]),
      tools,
      stopWhen: stepCountIs(10),
    });

    const toolCalls = extractToolCalls(steps as Array<Record<string, unknown>>);

    // Find session file if any was written/edited
    const sessionFile = toolCalls.find(
      (tc) =>
        (tc.toolName === "write_file" || tc.toolName === "edit_file") &&
        typeof tc.args.file_path === "string" &&
        tc.args.file_path.startsWith("Sessions/"),
    )?.args.file_path as string | undefined;

    const result: ArchivistResult = {
      summary: text,
      sessionFile,
      toolCalls,
    };

    if (logId) await completeAgentLog(logId, result);
    return result;
  } catch (error) {
    console.error(`Error running archivist:`, error);
    if (logId) {
      await failAgentLog(
        logId,
        error instanceof Error ? error.message : String(error),
      );
    }
    throw new Error(
      `Failed to run archivist: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}
