-- Phase 4: Multi-game support
-- Remove filesDir, add name/description/updatedAt to Game

-- Step 1: Add new columns
ALTER TABLE "Game" ADD COLUMN "name" TEXT;
ALTER TABLE "Game" ADD COLUMN "description" TEXT;
ALTER TABLE "Game" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Backfill name from filesDir for existing rows
UPDATE "Game" SET "name" = "filesDir" WHERE "name" IS NULL;

-- Step 3: Make name non-nullable
ALTER TABLE "Game" ALTER COLUMN "name" SET NOT NULL;

-- Step 4: Drop filesDir column and its unique index
DROP INDEX IF EXISTS "Game_filesDir_key";
ALTER TABLE "Game" DROP COLUMN "filesDir";

-- Step 5: Update RLS policies if they reference filesDir
-- (none do currently, so this is a no-op)
