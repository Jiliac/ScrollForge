import { promises as fs } from "fs";
import path from "path";
import { config } from "dotenv";

// Load env from .env.local
config({ path: ".env.local" });

const BFL_API_KEY = process.env.BFL_API_KEY;
const GAME_FILES_DIR = process.env.GAME_FILES_DIR;

if (!BFL_API_KEY) {
  console.error("Error: BFL_API_KEY not set in environment");
  process.exit(1);
}

if (!GAME_FILES_DIR) {
  console.error("Error: GAME_FILES_DIR not set in environment");
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BflSubmitResponse {
  id: string;
  polling_url: string;
  cost: number;
}

interface BflPollResponse {
  id: string;
  status: "Pending" | "Ready" | "Error";
  result?: {
    sample: string;
    prompt: string;
    seed: number;
  };
}

async function generateImage(prompt: string): Promise<string> {
  console.log(`Generating image for: "${prompt}"`);

  // 1. Submit job
  console.log("Submitting to BFL API...");
  const submitResponse = await fetch("https://api.bfl.ai/v1/flux-2-pro", {
    method: "POST",
    headers: {
      "x-key": BFL_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!submitResponse.ok) {
    throw new Error(
      `BFL API error: ${submitResponse.status} ${await submitResponse.text()}`,
    );
  }

  const { polling_url, cost } =
    (await submitResponse.json()) as BflSubmitResponse;
  console.log(`Job submitted. Cost: $${(cost / 100).toFixed(3)}`);

  // 2. Poll until ready
  console.log("Waiting for image...");
  let result: BflPollResponse["result"];

  while (true) {
    const pollResponse = await fetch(polling_url, {
      headers: { "x-key": BFL_API_KEY! },
    });

    if (!pollResponse.ok) {
      throw new Error(`Poll error: ${pollResponse.status}`);
    }

    const data = (await pollResponse.json()) as BflPollResponse;

    if (data.status === "Ready" && data.result) {
      result = data.result;
      console.log("Image ready!");
      break;
    } else if (data.status === "Error") {
      throw new Error("BFL job failed");
    }

    process.stdout.write(".");
    await sleep(1000);
  }

  // 3. Download image
  console.log("\nDownloading image...");
  const imageResponse = await fetch(result!.sample);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }
  const imageBuffer = await imageResponse.arrayBuffer();

  // 4. Save to images folder
  const timestamp = Date.now();
  const filename = `${timestamp}.jpeg`;
  const imagesDir = path.join(GAME_FILES_DIR!, "images");

  await fs.mkdir(imagesDir, { recursive: true });
  const filepath = path.join(imagesDir, filename);
  await fs.writeFile(filepath, Buffer.from(imageBuffer));

  console.log(`Saved to: ${filepath}`);
  return filepath;
}

// CLI entry point
const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
  console.log("Usage: npx tsx scripts/generate-image.ts <prompt>");
  console.log(
    'Example: npx tsx scripts/generate-image.ts "A Persian merchant in a bazaar"',
  );
  process.exit(1);
}

generateImage(prompt)
  .then((filepath) => {
    console.log(`\nDone! Image saved to: ${filepath}`);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
