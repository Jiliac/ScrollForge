import { promises as fs } from "fs";
import path from "path";
import { config } from "dotenv";

config({ path: ".env" });

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

async function loadImageAsBase64(slug: string): Promise<string> {
  const imagesDir = path.join(GAME_FILES_DIR!, "images");
  // Try common extensions
  for (const ext of [".jpeg", ".jpg", ".png", ".webp"]) {
    const filepath = path.join(imagesDir, `${slug}${ext}`);
    try {
      const buffer = await fs.readFile(filepath);
      const base64 = buffer.toString("base64");
      const mimeType =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";
      return `data:${mimeType};base64,${base64}`;
    } catch {
      continue;
    }
  }
  throw new Error(`Image not found for slug: ${slug}`);
}

async function generateImage(
  prompt: string,
  slug?: string,
  refSlugs?: string[],
): Promise<string> {
  console.log(`Generating image for: "${prompt}"`);
  if (slug) console.log(`Slug: ${slug}`);
  if (refSlugs?.length) console.log(`Reference images: ${refSlugs.join(", ")}`);

  // Determine endpoint based on whether we have reference images
  const hasRefs = refSlugs && refSlugs.length > 0;
  const endpoint = hasRefs
    ? "https://api.bfl.ai/v1/flux-kontext-pro"
    : "https://api.bfl.ai/v1/flux-2-pro";

  // Build request body
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = { prompt };

  if (hasRefs) {
    // Load reference images as base64
    const refKeys = [
      "input_image",
      "input_image_2",
      "input_image_3",
      "input_image_4",
    ];
    for (let i = 0; i < Math.min(refSlugs.length, 4); i++) {
      console.log(`Loading reference: ${refSlugs[i]}...`);
      body[refKeys[i]] = await loadImageAsBase64(refSlugs[i]);
    }
  }

  // 1. Submit job
  console.log(`Submitting to BFL API (${hasRefs ? "Kontext" : "FLUX 2"})...`);
  const submitResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-key": BFL_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
  const filename = slug ? `${slug}.jpeg` : `${Date.now()}.jpeg`;
  const imagesDir = path.join(GAME_FILES_DIR!, "images");

  await fs.mkdir(imagesDir, { recursive: true });
  const filepath = path.join(imagesDir, filename);
  await fs.writeFile(filepath, Buffer.from(imageBuffer));

  console.log(`Saved to: ${filepath}`);
  return filepath;
}

// CLI entry point
const args = process.argv.slice(2);
let slug: string | undefined;
const refSlugs: string[] = [];
const promptParts: string[] = [];

// Parse args
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--slug" && args[i + 1]) {
    slug = args[i + 1];
    i++;
  } else if (args[i] === "--ref" && args[i + 1]) {
    refSlugs.push(args[i + 1]);
    i++;
  } else {
    promptParts.push(args[i]);
  }
}

const prompt = promptParts.join(" ");

if (!prompt) {
  console.log(
    "Usage: npx tsx scripts/generate-image.ts [--slug <name>] [--ref <slug>]... <prompt>",
  );
  console.log("");
  console.log("Options:");
  console.log("  --slug <name>   Output filename (without extension)");
  console.log(
    "  --ref <slug>    Reference image slug (can use multiple, max 4)",
  );
  console.log("");
  console.log("Examples:");
  console.log('  npx tsx scripts/generate-image.ts "A Persian merchant"');
  console.log(
    '  npx tsx scripts/generate-image.ts --slug bazaar "A bustling bazaar"',
  );
  console.log(
    '  npx tsx scripts/generate-image.ts --ref mahmud-portrait --slug mahmud-angry "Mahmud looking angry"',
  );
  process.exit(1);
}

generateImage(prompt, slug, refSlugs.length > 0 ? refSlugs : undefined)
  .then((filepath) => {
    console.log(`\nDone! Image saved to: ${filepath}`);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
