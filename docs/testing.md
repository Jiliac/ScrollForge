# Testing Strategy

## Framework

**Vitest** - fast, native TypeScript/ESM, Jest-compatible API.

## What to Test

| Priority | Path                       | Notes                           |
| -------- | -------------------------- | ------------------------------- |
| 1        | `src/lib/*`                | Pure functions, no mocking      |
| 2        | `src/app/api/chat/tools/*` | Mock fs/LLM calls               |
| 3        | `src/agents/types.ts`      | Zod schema validation           |
| 4        | `src/agents/*.ts`          | Mock `generateText`, test logic |

## What to Skip (for now)

- **Components** (`src/components/*`) - needs jsdom, low ROI
- **API routes** (`src/app/api/**/route.ts`) - integration test territory
- **E2E** - overkill, complex setup
- **Generated code** (`src/generated/*`)
