-- Fix: tighten RLS policies on Game and Image tables to be owner-scoped
-- Previously these allowed all authenticated users to read all records

-- Game: replace open SELECT with owner-scoped ALL
DROP POLICY IF EXISTS "Authenticated users can read games" ON "Game";
CREATE POLICY "Users can manage own games" ON "Game"
  FOR ALL USING (auth.uid()::text = "userId");

-- Image: replace open SELECT with owner-scoped ALL (via Game join)
DROP POLICY IF EXISTS "Authenticated users can read images" ON "Image";
CREATE POLICY "Users can manage own images" ON "Image"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Game"
      WHERE "Game"."id" = "Image"."gameId"
        AND "Game"."userId" = auth.uid()::text
    )
  );
