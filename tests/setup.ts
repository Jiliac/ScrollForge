import { afterEach, beforeEach, vi } from "vitest";

// Mock server-only package (Next.js specific, throws on client)
vi.mock("server-only", () => ({}));

beforeEach(() => {
  // Ensure tests don't accidentally touch real local game files
  process.env.GAME_FILES_DIR =
    process.env.GAME_FILES_DIR || "TEST_GAME_FILES_DIR_NOT_SET";

  // Silence console during tests
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
