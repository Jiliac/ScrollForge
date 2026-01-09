/**
 * Test script for the orchestrator agent.
 *
 * Usage:
 *   pnpm tsx scripts/eval/test-orchestrator.ts "I'd like to end the day and rest"
 *   pnpm tsx scripts/eval/test-orchestrator.ts "Let's skip to next week"
 *   pnpm tsx scripts/eval/test-orchestrator.ts "I walk over to the merchant stall"
 */

import "dotenv/config";
import { runOrchestrator } from "@/agents/orchestrator";
import { loadGameContext } from "@/lib/game-files";
import { loadGameConfig } from "@/lib/game-config";
import { getSystemPrompt } from "@/agents/prompts";
import type { UIMessage } from "ai";

async function main() {
  const userInput = process.argv[2];

  if (!userInput) {
    console.error(
      "Usage: pnpm tsx scripts/test-orchestrator.ts <user message>",
    );
    console.error('Example: pnpm tsx scripts/test-orchestrator.ts "End day 6"');
    process.exit(1);
  }

  console.log("Loading game config and context...");
  const [config, context] = await Promise.all([
    loadGameConfig(),
    loadGameContext(),
  ]);
  const gameSystem = getSystemPrompt(config);
  console.log(`Game system loaded (${gameSystem.length} chars)`);
  console.log(`Game context loaded (${context.length} chars)\n`);

  // Build messages the same way chat2/route.ts does
  const contextMessage: UIMessage | null = context
    ? {
        id: "game-context",
        role: "user",
        parts: [{ type: "text", text: `# Game Context\n\n${context}` }],
      }
    : null;

  const userMessage: UIMessage = {
    id: "test-user-msg",
    role: "user",
    parts: [{ type: "text", text: userInput }],
  };

  const messages: UIMessage[] = contextMessage
    ? [contextMessage, userMessage]
    : [userMessage];

  console.log(`User message: "${userInput}"\n`);
  console.log("Calling orchestrator...\n");

  const start = Date.now();
  const decision = await runOrchestrator({ gameSystem, messages });
  const elapsed = Date.now() - start;

  console.log("=== Orchestrator Decision ===");
  console.log(JSON.stringify(decision, null, 2));
  console.log(`\n(${elapsed}ms)`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
