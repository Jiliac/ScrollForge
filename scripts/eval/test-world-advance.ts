/**
 * Test script for the world_advance agent.
 *
 * Usage:
 *   pnpm tsx scripts/eval/test-world-advance.ts "Create new merchant NPC in the bazaar"
 *   pnpm tsx scripts/eval/test-world-advance.ts "Roll for Herat Connection thread - it has matured"
 *   pnpm tsx scripts/eval/test-world-advance.ts "Advance thread clocks by 1 week"
 *
 * Or use the mock data from orchestration.json:
 *   pnpm tsx scripts/eval/test-world-advance.ts --from-file
 */

import "dotenv/config";
import { runWorldAdvance } from "@/agents/world-builder";
import { getCurrentGameId, loadGameContext } from "@/lib/game-files";

const TEST_USER_ID = "4945e9a2-202b-477f-9b9e-e3b2d56b951f";

type WorldAdvanceStep = { type: "world_advance"; description: string };

async function main() {
  const useFile = process.argv.includes("--from-file");

  let steps: WorldAdvanceStep[];

  if (useFile) {
    // Load from orchestration.json
    const data = await import("./orchestration.json");
    const allSteps = data.preSteps as Array<{
      type: string;
      description?: string;
    }>;
    steps = allSteps
      .filter(
        (s): s is WorldAdvanceStep =>
          s.type === "world_advance" && !!s.description,
      )
      .map((s) => ({
        type: "world_advance" as const,
        description: s.description,
      }));
    console.log(
      `Loaded ${steps.length} world_advance steps from orchestration.json\n`,
    );
  } else {
    const description = process.argv.slice(2).join(" ");

    if (!description) {
      console.error(
        "Usage: pnpm tsx scripts/eval/test-world-advance.ts <description>",
      );
      console.error(
        "  or: pnpm tsx scripts/eval/test-world-advance.ts --from-file",
      );
      console.error(
        '\nExample: pnpm tsx scripts/eval/test-world-advance.ts "Create new merchant NPC"',
      );
      process.exit(1);
    }

    steps = [{ type: "world_advance", description }];
  }

  const gameId = await getCurrentGameId(TEST_USER_ID);
  console.log("Loading game context...");
  const context = await loadGameContext(gameId);
  console.log(`Context loaded (${context.length} chars)\n`);

  for (const step of steps) {
    console.log("=".repeat(60));
    console.log(`Description: ${step.description}`);
    console.log("=".repeat(60));

    const start = Date.now();
    const result = await runWorldAdvance(step, context, undefined, gameId);
    const elapsed = Date.now() - start;

    if (result.toolCalls.length > 0) {
      console.log("\n--- Tool Calls ---");
      for (const tc of result.toolCalls) {
        console.log(`\n[${tc.toolName}]`);
        console.log(JSON.stringify(tc.args, null, 2));
      }
    }

    console.log("\n--- Summary ---");
    console.log(result.summary);
    console.log(`\n(${elapsed}ms)\n`);
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
