-- Make userId required (NOT NULL)
-- First, fill any NULL userId with the first available user
UPDATE "Rating" 
SET "userId" = (SELECT "id" FROM "User" LIMIT 1)
WHERE "userId" IS NULL;

-- Now alter the table to make userId NOT NULL
PRAGMA foreign_keys=OFF;

CREATE TABLE "Rating_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "Rating_new" 
SELECT "id", "userId", "entryId", "entryType", "score", "notes", "createdAt", "updatedAt" 
FROM "Rating";

DROP TABLE "Rating";

ALTER TABLE "Rating_new" RENAME TO "Rating";

-- Recreate index
CREATE UNIQUE INDEX "Rating_userId_entryId_entryType_key" ON "Rating"("userId", "entryId", "entryType");

PRAGMA foreign_keys=ON;
