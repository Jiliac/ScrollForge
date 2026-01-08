import { tool } from "ai";
import { z } from "zod";

interface ParsedRange {
  min: number;
  max: number;
  text: string;
}

interface ParseResult {
  success: true;
  ranges: ParsedRange[];
}

interface ParseError {
  success: false;
  error: string;
}

function parseStakes(stakes: string): ParseResult | ParseError {
  // Match range markers and capture text until the next range marker or end of string
  // This approach is more robust than requiring periods - it handles:
  // - Em-dashes, semicolons, question marks in outcome text
  // - Multiple sentences
  // - Missing trailing periods
  const rangeRegex =
    /(\d+)\s*-\s*(\d+)\s*:\s*([\s\S]*?)(?=\s*\d+\s*-\s*\d+\s*:|$)/g;
  const ranges: ParsedRange[] = [];

  let match;
  while ((match = rangeRegex.exec(stakes)) !== null) {
    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);
    const text = match[3].trim();

    // Skip if we captured an empty outcome or if numbers look like they're part of text
    // (e.g., "costs 50-60 dinars" shouldn't create a range)
    if (!text) {
      continue;
    }

    if (min > max) {
      return {
        success: false,
        error: `Invalid range: ${min}-${max}. Min must be less than or equal to max.`,
      };
    }

    ranges.push({ min, max, text });
  }

  if (ranges.length === 0) {
    return {
      success: false,
      error:
        "No valid ranges found. Format: '1-20: Outcome one. 21-50: Outcome two. 51-100: Outcome three.'",
    };
  }

  // Sort ranges by min value
  ranges.sort((a, b) => a.min - b.min);

  // Check that ranges start at 1
  if (ranges[0].min !== 1) {
    return {
      success: false,
      error: `Ranges must start at 1. First range starts at ${ranges[0].min}.`,
    };
  }

  // Check that ranges end at 100
  if (ranges[ranges.length - 1].max !== 100) {
    return {
      success: false,
      error: `Ranges must end at 100. Last range ends at ${ranges[ranges.length - 1].max}.`,
    };
  }

  // Check for gaps and overlaps
  for (let i = 1; i < ranges.length; i++) {
    const prev = ranges[i - 1];
    const curr = ranges[i];

    if (curr.min > prev.max + 1) {
      return {
        success: false,
        error: `Gap in ranges between ${prev.max} and ${curr.min}.`,
      };
    }

    if (curr.min <= prev.max) {
      return {
        success: false,
        error: `Overlapping ranges: ${prev.min}-${prev.max} and ${curr.min}-${curr.max}.`,
      };
    }
  }

  return { success: true, ranges };
}

export const twistOfFateTool = tool({
  description: `Roll the dice of fate. You MUST pre-commit to outcomes before seeing the roll.

Provide a stakes string defining what happens across the full 1-100 range.

Format: "1-20: [dire outcome] 21-40: [setback] 41-60: [mixed result] 61-80: [success] 81-100: [great fortune]"

Rules:
- Ranges must cover exactly 1-100 with no gaps or overlaps
- Low rolls (1-20) should have REAL consequences, not just minor inconvenience
- You are BOUND by the outcome you pre-commit to
- After seeing the roll, narrate the matched outcome faithfully`,
  inputSchema: z.object({
    stakes: z
      .string()
      .describe(
        "Define outcomes for the full 1-100 range. Format: '1-20: [outcome] 21-45: [outcome] ...' Outcome text can include any punctuation.",
      ),
  }),
  execute: async ({ stakes }) => {
    const parsed = parseStakes(stakes);

    if (!parsed.success) {
      return { success: false, error: parsed.error };
    }

    const roll = Math.floor(Math.random() * 100) + 1;
    const matched = parsed.ranges.find((r) => roll >= r.min && roll <= r.max);

    if (!matched) {
      return { success: false, error: "No matching range found for roll." };
    }

    return {
      success: true,
      roll,
      outcome: matched.text,
    };
  },
});
