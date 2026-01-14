/**
 * Delete pending episodes and re-add them.
 * Usage: pnpm tsx scripts/retry-pending-episodes.ts
 */

import "dotenv/config";
import { ZepClient } from "@getzep/zep-cloud";

const USER_ID = "cmka3ad310000dgp15on6npi9";

async function main() {
  const apiKey = process.env.ZEP_API_KEY;
  if (!apiKey) {
    console.error("Error: ZEP_API_KEY environment variable is not set");
    process.exit(1);
  }

  const zep = new ZepClient({ apiKey });

  // Get all episodes
  const result = await zep.graph.episode.getByUserId(USER_ID, { lastn: 100 });
  const episodes = result.episodes ?? [];

  const pending = episodes.filter((e) => !e.processed);
  const processed = episodes.filter((e) => e.processed);

  console.log(`Total episodes: ${episodes.length}`);
  console.log(`Processed: ${processed.length}`);
  console.log(`Pending: ${pending.length}`);

  if (pending.length === 0) {
    console.log("No pending episodes to retry!");
    return;
  }

  // Save pending episode content before deleting
  const pendingContent = pending.map((ep) => ({
    uuid: ep.uuid,
    content: ep.content,
  }));

  console.log(`\nDeleting ${pending.length} pending episodes...`);

  // Delete pending episodes
  for (const ep of pending) {
    try {
      await zep.graph.episode.delete(ep.uuid!);
      console.log(`  Deleted: ${ep.uuid}`);
    } catch (err) {
      console.error(
        `  Failed to delete ${ep.uuid}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(
    `\nRe-adding ${pendingContent.length} episodes in smaller batches...`,
  );

  // Re-add in smaller batches of 5 to avoid overwhelming
  const BATCH_SIZE = 5;
  for (let i = 0; i < pendingContent.length; i += BATCH_SIZE) {
    const batch = pendingContent.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pendingContent.length / BATCH_SIZE);

    try {
      await zep.graph.addBatch({
        userId: USER_ID,
        episodes: batch.map((ep) => ({
          data: ep.content!,
          type: "text" as const,
        })),
      });
      console.log(
        `  Batch ${batchNum}/${totalBatches}: Added ${batch.length} episodes`,
      );

      // Small delay between batches
      if (i + BATCH_SIZE < pendingContent.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error(
        `  Batch ${batchNum} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log("\nDone! Check status in a few minutes with:");
  console.log("  pnpm tsx scripts/check-zep-status.ts");
}

main().catch(console.error);
