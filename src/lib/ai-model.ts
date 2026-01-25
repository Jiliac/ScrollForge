import { openai } from "@ai-sdk/openai";

/**
 * The default model used across the application.
 * Currently set to gpt-5.2 from OpenAI.
 * Easily switch to other providers (e.g. gemini, anthropic) by changing this constant.
 */
export const defaultModel = openai("gpt-5.2");

/**
 * Secondary model used for fallbacks or specific tasks if needed.
 */
// export const fallbackModel = anthropic("claude-3-5-sonnet-20240620");
