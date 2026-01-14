import "dotenv/config";
import { ZepClient } from "@getzep/zep-cloud";

async function main() {
  const apiKey = process.env.ZEP_API_KEY;
  if (!apiKey) {
    console.error("Error: ZEP_API_KEY environment variable is not set");
    process.exit(1);
  }

  const zep = new ZepClient({ apiKey });
  const episodes = await zep.graph.episode.getByUserId(
    "cmka3ad310000dgp15on6npi9",
    { lastn: 100 },
  );

  console.log("=== Processed Episodes ===");
  for (const ep of (episodes.episodes ?? []).filter((e) => e.processed)) {
    const preview = ep.content?.slice(0, 60).replace(/\n/g, " ");
    console.log(`${ep.content?.length ?? 0} chars | ${preview}...`);
  }

  console.log("\n=== Pending Episodes ===");
  for (const ep of (episodes.episodes ?? []).filter((e) => !e.processed)) {
    const preview = ep.content?.slice(0, 60).replace(/\n/g, " ");
    console.log(`${ep.content?.length ?? 0} chars | ${preview}...`);
  }
}
main().catch(console.error);
