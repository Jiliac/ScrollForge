import { getImageUrlBySlug } from "./image-index";
import { getImageUrl } from "./storage";

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

export async function loadImageAsBase64(
  gameId: string,
  slug: string,
): Promise<string> {
  // Look up the stored URL, or construct it from the default storage path
  const url =
    (await getImageUrlBySlug(gameId, slug)) ??
    getImageUrl(`games/${gameId}/images/${slug}.jpeg`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch image for slug: ${slug} (${response.status})`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const base64 = buffer.toString("base64");
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  return `data:${contentType};base64,${base64}`;
}

export async function generateImageWithBfl(
  gameId: string,
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
      body[refKeys[i]] = await loadImageAsBase64(gameId, refSlugs[i]);
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
