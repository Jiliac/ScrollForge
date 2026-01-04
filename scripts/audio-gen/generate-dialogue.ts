import { promises as fs } from "fs";
import { config } from "dotenv";

config({ path: ".env" });

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;

if (!ELEVEN_LABS_API_KEY) {
  console.error("Error: ELEVEN_LABS_API_KEY not set in environment");
  process.exit(1);
}

interface Voice {
  voice_id: string;
  name: string;
}

interface DialogueLine {
  speaker: string;
  text: string;
}

interface DialogueFile {
  title: string;
  voices: Record<string, Voice>;
  dialogue: DialogueLine[];
}

interface ElevenLabsInput {
  text: string;
  voice_id: string;
}

async function generateDialogue(
  inputPath: string,
  outputPath?: string,
): Promise<string> {
  // Load dialogue JSON
  const raw = await fs.readFile(inputPath, "utf-8");
  const data: DialogueFile = JSON.parse(raw);

  console.log(`Generating dialogue: "${data.title}"`);
  console.log(`Lines: ${data.dialogue.length}`);

  // Build inputs array for ElevenLabs
  const inputs: ElevenLabsInput[] = data.dialogue.map((line) => {
    const voice = data.voices[line.speaker];
    if (!voice) {
      throw new Error(`Unknown speaker: ${line.speaker}`);
    }
    console.log(`  [${voice.name}]: "${line.text.slice(0, 50)}..."`);
    return {
      text: line.text,
      voice_id: voice.voice_id,
    };
  });

  // Call ElevenLabs Text to Dialogue API
  console.log("\nCalling ElevenLabs Text to Dialogue API...");

  const response = await fetch(
    "https://api.elevenlabs.io/v1/text-to-dialogue",
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_LABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: "eleven_v3",
        inputs,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
  }

  // Get audio data
  const audioBuffer = await response.arrayBuffer();
  console.log(`Received ${audioBuffer.byteLength} bytes of audio`);

  // Determine output path
  const outPath =
    outputPath ||
    inputPath.replace(".json", ".mp3").replace("dialogue-", "audio-");

  await fs.writeFile(outPath, Buffer.from(audioBuffer));
  console.log(`Saved to: ${outPath}`);

  return outPath;
}

// CLI entry point
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(
    "Usage: npx tsx scripts/generate-dialogue.ts <dialogue.json> [output.mp3]",
  );
  console.log("");
  console.log("Examples:");
  console.log(
    "  npx tsx scripts/generate-dialogue.ts scripts/dialogue-test.json",
  );
  console.log(
    "  npx tsx scripts/generate-dialogue.ts scripts/dialogue-test.json output.mp3",
  );
  process.exit(1);
}

const inputPath = args[0];
const outputPath = args[1];

generateDialogue(inputPath, outputPath)
  .then((filepath) => {
    console.log(`\nDone! Audio saved to: ${filepath}`);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
