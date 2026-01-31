-- Create auth schema and uid() stub if not on Supabase (e.g. Prisma shadow database)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
  END IF;
END $$;

-- Create authenticated role if it doesn't exist (exists on Supabase, not on shadow DB)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

-- Lock down Prisma's internal table (no policies = no access via REST API)
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Game" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Image" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentLog" ENABLE ROW LEVEL SECURITY;

-- User: users can read/update only their own row
CREATE POLICY "Users can read own row" ON "User"
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own row" ON "User"
  FOR UPDATE USING (auth.uid()::text = id);

-- Game: read-only for all authenticated users (shared resource)
CREATE POLICY "Authenticated users can read games" ON "Game"
  FOR SELECT TO authenticated USING (true);

-- Image: read-only for all authenticated users (shared resource)
CREATE POLICY "Authenticated users can read images" ON "Image"
  FOR SELECT TO authenticated USING (true);

-- Conversation: users can CRUD only their own
CREATE POLICY "Users can manage own conversations" ON "Conversation"
  FOR ALL USING (auth.uid()::text = "userId");

-- Message: users can CRUD messages in their own conversations
CREATE POLICY "Users can manage own messages" ON "Message"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Conversation"
      WHERE "Conversation".id = "Message"."conversationId"
        AND "Conversation"."userId" = auth.uid()::text
    )
  );

-- AgentLog: users can read logs for their own conversations
CREATE POLICY "Users can read own agent logs" ON "AgentLog"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Conversation"
      WHERE "Conversation".id = "AgentLog"."conversationId"
        AND "Conversation"."userId" = auth.uid()::text
    )
  );
