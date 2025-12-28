import { promises as fs } from "fs";
import path from "path";
import { getGameFilesDir } from "./game-files";

const BFL_API_KEY = process.env.BFL_API_KEY;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loadImageAsBase64(slug: string): Promise<string> {
  const imagesDir = path.join(getGameFilesDir(), "images");
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

export async function generateImageWithBfl(
  prompt: string,
  refSlugs?: string[],
): Promise<Buffer> {
  if (!BFL_API_KEY) {
    throw new Error("BFL_API_KEY not configured");
  }

  const hasRefs = refSlugs && refSlugs.length > 0;
  const endpoint = hasRefs
    ? "https://api.bfl.ai/v1/flux-kontext-pro"
    : "https://api.bfl.ai/v1/flux-2-pro";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = { prompt };

  if (hasRefs) {
    const refKeys = [
      "input_image",
      "input_image_2",
      "input_image_3",
      "input_image_4",
    ];
    for (let i = 0; i < Math.min(refSlugs.length, 4); i++) {
      body[refKeys[i]] = await loadImageAsBase64(refSlugs[i]);
    }
  }

  // Submit job
  const submitResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-key": BFL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!submitResponse.ok) {
    throw new Error(`BFL API error: ${submitResponse.status}`);
  }

  const { polling_url } = (await submitResponse.json()) as BflSubmitResponse;

  // Poll until ready
  let imageUrl: string | undefined;
  for (let i = 0; i < 120; i++) {
    const pollResponse = await fetch(polling_url, {
      headers: { "x-key": BFL_API_KEY },
    });

    if (!pollResponse.ok) {
      throw new Error(`Poll error: ${pollResponse.status}`);
    }

    const data = (await pollResponse.json()) as BflPollResponse;

    if (data.status === "Ready" && data.result) {
      imageUrl = data.result.sample;
      break;
    } else if (data.status === "Error") {
      throw new Error("BFL job failed");
    }

    await sleep(1000);
  }

  if (!imageUrl) {
    throw new Error("Timeout waiting for image");
  }

  // Download image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  return Buffer.from(await imageResponse.arrayBuffer());
}
