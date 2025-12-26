import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

async function main() {
  console.log("Testing Anthropic API connection...\n");

  const result = await generateText({
    model: anthropic("claude-opus-4-5-20251101"),
    messages: [
      { role: "user", content: "Say hello in one sentence." }
    ],
  });

  console.log("Response:", result.text);
  console.log("\nUsage:", result.usage);
}

main().catch(console.error);
