-- AlterTable: add config (nullable) and userId (nullable first for backfill)
ALTER TABLE "Game" ADD COLUMN "config" JSONB;
ALTER TABLE "Game" ADD COLUMN "userId" TEXT;

-- Backfill existing Game rows with the known user
UPDATE "Game" SET "userId" = '4945e9a2-202b-477f-9b9e-e3b2d56b951f' WHERE "userId" IS NULL;

-- Now make userId NOT NULL
ALTER TABLE "Game" ALTER COLUMN "userId" SET NOT NULL;

-- CreateTable
CREATE TABLE "GameFile" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameFile_gameId_idx" ON "GameFile"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameFile_gameId_path_key" ON "GameFile"("gameId", "path");

-- CreateIndex
CREATE INDEX "Game_userId_idx" ON "Game"("userId");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameFile" ADD CONSTRAINT "GameFile_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS for GameFile: user can CRUD files in games they own
ALTER TABLE "GameFile" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage files in their own games"
ON "GameFile"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "Game"
    WHERE "Game"."id" = "GameFile"."gameId"
    AND "Game"."userId" = auth.uid()::text
  )
);
