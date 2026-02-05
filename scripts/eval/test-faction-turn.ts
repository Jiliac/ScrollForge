/**
 * Test script for the faction_turn agent.
 *
 * Usage:
 *   pnpm tsx scripts/eval/test-faction-turn.ts "Davud Zarrin" "Day 12 evening — what moves does he make?"
 *   pnpm tsx scripts/eval/test-faction-turn.ts "Mahmud Tabari" "Commission halfway done — monitoring progress"
 *
 * Or use the mock data from orchestration.json:
 *   pnpm tsx scripts/eval/test-faction-turn.ts --from-file
 */

import "dotenv/config";
import { runFactionTurn } from "@/agents/faction-turn";
import { loadGameContext } from "@/lib/game-files";

type FactionTurnStep = {
  type: "faction_turn";
  faction: string;
  situation: string;
};

async function main() {
  const useFile = process.argv.includes("--from-file");

  let steps: FactionTurnStep[];

  if (useFile) {
    // Load from orchestration.json
    const data = await import("./orchestration.json");
    steps = (data.preSteps as FactionTurnStep[]).filter(
      (s) => s.type === "faction_turn",
    );
    console.log(
      `Loaded ${steps.length} faction_turn steps from orchestration.json\n`,
    );
  } else {
    const faction = process.argv[2];
    const situation = process.argv[3];

    if (!faction || !situation) {
      console.error(
        "Usage: pnpm tsx scripts/eval/test-faction-turn.ts <faction> <situation>",
      );
      console.error(
        "  or: pnpm tsx scripts/eval/test-faction-turn.ts --from-file",
      );
      console.error(
        '\nExample: pnpm tsx scripts/eval/test-faction-turn.ts "Davud Zarrin" "Day 12 evening"',
      );
      process.exit(1);
    }

    steps = [{ type: "faction_turn", faction, situation }];
  }

  const gameId = process.env.GAME_ID;
  if (!gameId) {
    console.error("Set GAME_ID env var");
    process.exit(1);
  }
  console.log("Loading game context...");
  const context = await loadGameContext(gameId);
  console.log(`Context loaded (${context.length} chars)\n`);

  for (const step of steps) {
    console.log("=".repeat(60));
    console.log(`Faction: ${step.faction}`);
    console.log(`Situation: ${step.situation}`);
    console.log("=".repeat(60));

    const start = Date.now();
    const result = await runFactionTurn(step, context, undefined, gameId);
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
