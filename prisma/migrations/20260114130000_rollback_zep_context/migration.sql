-- Rollback: Remove zepContext column from Message table
-- Reverses migrations:
--   20260114063508_add_zep_context
--   20260114092734_move_zep_context_to_message

-- SQLite doesn't support DROP COLUMN directly, so we recreate the table
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "parts" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Message" ("id", "conversationId", "role", "parts", "createdAt")
SELECT "id", "conversationId", "role", "parts", "createdAt" FROM "Message";

DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
