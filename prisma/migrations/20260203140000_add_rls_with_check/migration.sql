-- Add WITH CHECK clauses to RLS policies for INSERT/UPDATE safety

-- Game: recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can manage own games" ON "Game";
CREATE POLICY "Users can manage own games" ON "Game"
  FOR ALL
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- Image: recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can manage own images" ON "Image";
CREATE POLICY "Users can manage own images" ON "Image"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Game"
      WHERE "Game"."id" = "Image"."gameId"
        AND "Game"."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Game"
      WHERE "Game"."id" = "Image"."gameId"
        AND "Game"."userId" = auth.uid()::text
    )
  );

-- GameFile: recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can manage files in their own games" ON "GameFile";
CREATE POLICY "Users can manage files in their own games" ON "GameFile"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Game"
      WHERE "Game"."id" = "GameFile"."gameId"
        AND "Game"."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Game"
      WHERE "Game"."id" = "GameFile"."gameId"
        AND "Game"."userId" = auth.uid()::text
    )
  );
