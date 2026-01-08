# Tales of the Golden Age (rpg-llm)

A Next.js app for running an RPG chat experience powered by an LLM, with a “game files” directory (markdown + images) that the model can read and update via tools.

---

## Requirements

- Node.js (recommended: 20+)
- pnpm (recommended) or npm/yarn
- A database (SQLite by default via Prisma)
- API keys (depending on features you use):
  - Anthropic (required for chat)
  - Black Forest Labs (optional, for image generation)
  - ElevenLabs (optional, for audio scripts/tools if you use them)

---

## Setup

### 1) Install dependencies

Using pnpm:

```bash
pnpm install
```

Or npm:

```bash
npm install
```

### 2) Configure environment variables

Copy the example env file and edit it:

```bash
cp .env.example .env
```

Minimum required:

- `DATABASE_URL` (SQLite file path)
- `ANTHROPIC_API_KEY`
- `GAME_FILES_DIR` (path to your game content folder)

Example:

```env
DATABASE_URL="file:/absolute/path/to/project/prisma/dev.db"
ANTHROPIC_API_KEY="sk-ant-..."
GAME_FILES_DIR="/absolute/path/to/your/game_files"
```

Optional (only needed if you use these features):

```env
BFL_API_KEY="bfl_..."
ELEVEN_LABS_API_KEY="..."
```

### 3) Initialize the database

This project uses Prisma. Run migrations to create tables:

```bash
pnpm prisma migrate deploy
```

If you’re developing locally and want Prisma to create/apply migrations in dev mode, you may prefer:

```bash
pnpm prisma migrate dev
```

Note: the Prisma schema/migrations are already in the repo; you’re just applying them to your configured database.

### 4) Run the dev server

```bash
pnpm dev
```

Open:

- http://localhost:3000

---

## Expected folder structure (GAME_FILES_DIR)

The app loads “game context” from markdown files in `GAME_FILES_DIR`. It also serves images from `GAME_FILES_DIR/images` via the Next.js API route.

### Required/expected layout

At minimum:

```text
GAME_FILES_DIR/
  system.md                (optional but recommended)
  <any-folders>/
    <any>.md
  images/
    <image files...>
```

Notes:

- `system.md` (if present) is treated specially and used as the LLM “system” prompt.
- All other `*.md` files are loaded recursively and concatenated into a single “Game Context” message.
- The following directories are ignored when scanning markdown:
  - `images/`
  - `videos/`

So you can keep large assets there without bloating the prompt context.

### Image expectations

- Images should live under:

```text
GAME_FILES_DIR/images/
```

- The UI expects image paths like `images/<filename>` (e.g. `images/tahir-portrait.jpeg`).
- Images are served from:

```text
GET /api/images/<filename>
```

So an image stored at:

```text
GAME_FILES_DIR/images/tahir-portrait.jpeg
```

is accessible at:

```text
http://localhost:3000/api/images/tahir-portrait.jpeg
```

### Markdown image references

Some tools append markdown image references into your game files, like:

```md
![tahir-portrait](images/tahir-portrait.jpeg)
```

This is a relative path intended to work inside your `GAME_FILES_DIR` markdown files.

---

## How chat + persistence works (high level)

- The client generates a `conversationId` and sends it with chat requests.
- The server ensures the conversation exists.
- After a response finishes streaming, the client saves the full `UIMessage[]` to:

```text
POST /api/conversations/:id/messages
```

This preserves tool call parts and outputs.

---

## Tools that modify game files

The chat backend exposes tools that can write to your `GAME_FILES_DIR`, including:

- `write_file`: create/overwrite a markdown file
- `edit_file`: replace a unique string in a markdown file
- `create_image`: generate an image, save it under `images/`, update the image index, and append a markdown reference
- `search_image`: find an existing image by slug/tags/prompt

Because of this, you should treat `GAME_FILES_DIR` as editable content and consider putting it under version control separately (or backing it up).

---

## Troubleshooting

### “BFL_API_KEY not configured”

You tried to use image generation without setting `BFL_API_KEY`. Add it to `.env` or avoid image generation tools.

### Images not showing up

- Confirm the file exists at `GAME_FILES_DIR/images/<file>`
- Confirm the UI is referencing `images/<file>` (or the correct path)
- Try opening the direct URL: `/api/images/<file>`

### Game context not loading

- Confirm `GAME_FILES_DIR` points to the correct folder
- Confirm there are `.md` files present
- Check server logs for “Error loading game context”

---

## Scripts

Common commands:

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm format
```
