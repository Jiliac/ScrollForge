import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";

// BFL_API_KEY is captured at module load time via top-level const.
// vi.hoisted runs before any imports, so we can set it here.
const { mockGetImageUrlBySlug, originalBflKey } = vi.hoisted(() => {
  const originalBflKey = process.env.BFL_API_KEY;
  process.env.BFL_API_KEY = "test-bfl-key";
  return { mockGetImageUrlBySlug: vi.fn(), originalBflKey };
});

vi.mock("@/lib/image-index", () => ({
  getImageUrlBySlug: (...args: unknown[]) => mockGetImageUrlBySlug(...args),
}));

import { loadImageAsBase64, generateImageWithBfl } from "@/lib/bfl-api";

const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = originalFetch;
});

afterAll(() => {
  if (originalBflKey === undefined) {
    delete process.env.BFL_API_KEY;
  } else {
    process.env.BFL_API_KEY = originalBflKey;
  }
});

describe("loadImageAsBase64", () => {
  it("fetches image and returns data URI", async () => {
    const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockGetImageUrlBySlug.mockResolvedValueOnce(
      "https://xyz.supabase.co/storage/v1/object/public/game-images/games/g1/images/hero.jpeg",
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(imageBytes.buffer),
      headers: new Headers({ "content-type": "image/jpeg" }),
    });

    const result = await loadImageAsBase64("g1", "hero");

    expect(mockGetImageUrlBySlug).toHaveBeenCalledWith("g1", "hero");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://xyz.supabase.co/storage/v1/object/public/game-images/games/g1/images/hero.jpeg",
    );
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("throws when slug not found in database", async () => {
    mockGetImageUrlBySlug.mockResolvedValueOnce(null);

    await expect(loadImageAsBase64("g1", "missing")).rejects.toThrow(
      "Reference image not found in database: missing",
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws on fetch failure", async () => {
    mockGetImageUrlBySlug.mockResolvedValueOnce("https://example.com/img.jpeg");
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(loadImageAsBase64("g1", "hero")).rejects.toThrow(
      "Failed to fetch image for slug: hero (404)",
    );
  });

  it("defaults content-type to image/jpeg", async () => {
    mockGetImageUrlBySlug.mockResolvedValueOnce("https://example.com/img.jpeg");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      headers: new Headers(),
    });

    const result = await loadImageAsBase64("g1", "hero");
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });
});

describe("generateImageWithBfl", () => {
  // Note: BFL_API_KEY is captured at module load time, so we can't test
  // the "missing key" branch without module re-imports. The key check is
  // a simple guard and is covered implicitly by integration.

  it("submits to flux-2-pro without refs and polls until ready", async () => {
    const imageBuffer = Buffer.from("fake-image-data");

    // Submit response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "job-1",
          polling_url: "https://api.bfl.ai/poll/job-1",
        }),
    });

    // First poll: Pending
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "job-1", status: "Pending" }),
    });

    // Second poll: Ready
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "job-1",
          status: "Ready",
          result: { sample: "https://cdn.bfl.ai/result.jpeg" },
        }),
    });

    // Download result image
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(imageBuffer.buffer),
    });

    const resultPromise = generateImageWithBfl("g1", "a cat");
    // Advance past the sleep(1000) between poll attempts
    await vi.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

    // Submit call — flux-2-pro (no refs)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "https://api.bfl.ai/v1/flux-2-pro",
      expect.objectContaining({ method: "POST" }),
    );

    // Verify body contains prompt
    const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(submitBody).toEqual({ prompt: "a cat" });

    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("uses flux-kontext-pro with reference slugs", async () => {
    mockGetImageUrlBySlug.mockResolvedValueOnce("https://example.com/ref.jpeg");
    // loadImageAsBase64 fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      headers: new Headers({ "content-type": "image/jpeg" }),
    });

    // Submit
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "job-2",
          polling_url: "https://api.bfl.ai/poll/job-2",
        }),
    });

    // Poll: Ready immediately
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "job-2",
          status: "Ready",
          result: { sample: "https://cdn.bfl.ai/result2.jpeg" },
        }),
    });

    // Download
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(Buffer.from("img").buffer),
    });

    await generateImageWithBfl("g1", "a cat", ["ref-slug"]);

    // Submit call — flux-kontext-pro (has refs)
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://api.bfl.ai/v1/flux-kontext-pro",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws on submit failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(generateImageWithBfl("g1", "a cat")).rejects.toThrow(
      "BFL API error: 500",
    );
  });

  it("throws when BFL job errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "job-err",
          polling_url: "https://api.bfl.ai/poll/job-err",
        }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "job-err", status: "Error" }),
    });

    await expect(generateImageWithBfl("g1", "a cat")).rejects.toThrow(
      "BFL job failed",
    );
  });
});
