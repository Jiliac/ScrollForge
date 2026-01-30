// import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

/**
 * The default model used across the application.
 * Currently set to gpt-5.2 from OpenAI.
 * Easily switch to other providers (e.g. gemini, anthropic) by changing this constant.
 */
// export const defaultModel = openai("gpt-5.2");
export const defaultModel = google("gemini-3-flash-preview");
// export const defaultModel = google("gemini-3-pro-preview");

/**
 * Secondary model used for fallbacks or specific tasks if needed.
 */
// export const fallbackModel = anthropic("claude-opus-4-5-20251101");
