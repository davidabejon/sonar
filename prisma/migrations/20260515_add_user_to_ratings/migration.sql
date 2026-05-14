-- AlterTable - Add userId column
PRAGMA foreign_keys=OFF;

CREATE TABLE "Rating_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "entryId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Copy data from old table
INSERT INTO "Rating_new" 
SELECT "id", NULL, "entryId", "entryType", "score", "notes", "createdAt", "updatedAt" 
FROM "Rating";

DROP TABLE "Rating";

ALTER TABLE "Rating_new" RENAME TO "Rating";

-- Create index for unique constraint
CREATE UNIQUE INDEX "Rating_userId_entryId_entryType_key" ON "Rating"("userId", "entryId", "entryType");

PRAGMA foreign_keys=ON;
