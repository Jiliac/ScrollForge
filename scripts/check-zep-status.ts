/**
 * Check Zep task/graph status.
 * Usage: pnpm tsx scripts/check-zep-status.ts
 */

import "dotenv/config";
import { ZepClient } from "@getzep/zep-cloud";

async function main() {
  const apiKey = process.env.ZEP_API_KEY;
  if (!apiKey) {
    console.error("Error: ZEP_API_KEY environment variable is not set");
    process.exit(1);
  }

  const zep = new ZepClient({ apiKey });

  // Check project info
  console.log("=== Project Info ===");
  try {
    const project = await zep.project.get();
    console.log(JSON.stringify(project, null, 2));
  } catch (err) {
    console.log(
      "Error getting project:",
      err instanceof Error ? err.message : String(err),
    );
  }

  // List users
  const usersResult = await zep.user.listOrdered({
    pageNumber: 1,
    pageSize: 100,
  });
  console.log("=== Zep Users ===");
  console.log(`Total users: ${usersResult.totalCount}`);
  for (const user of usersResult.users ?? []) {
    console.log(`- ${user.userId} (created: ${user.createdAt})`);
  }

  // For each user, check episodes
  console.log("\n=== Episodes per User ===");
  for (const user of usersResult.users ?? []) {
    try {
      const episodes = await zep.graph.episode.getByUserId(user.userId!, {
        lastn: 100,
      });
      const pending = episodes.episodes?.filter((e) => !e.processed) ?? [];
      const processed = episodes.episodes?.filter((e) => e.processed) ?? [];

      console.log(`\nUser: ${user.userId}`);
      console.log(`  Total episodes: ${episodes.episodes?.length ?? 0}`);
      console.log(`  Processed: ${processed.length}`);
      console.log(`  Pending: ${pending.length}`);

      if (pending.length > 0) {
        console.log("  Pending episodes:");
        for (const ep of pending.slice(0, 5)) {
          console.log(`    - UUID: ${ep.uuid}, Created: ${ep.createdAt}`);
        }
        if (pending.length > 5) {
          console.log(`    ... and ${pending.length - 5} more`);
        }
      }

      // Check nodes and edges
      const nodes = await zep.graph.node.getByUserId(user.userId!, {});
      const edges = await zep.graph.edge.getByUserId(user.userId!, {});
      console.log(`  Nodes: ${nodes.length}`);
      console.log(`  Edges: ${edges.length}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`User ${user.userId}: ${message}`);
    }
  }
}

main().catch(console.error);
