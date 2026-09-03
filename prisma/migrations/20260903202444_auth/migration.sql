-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF', 'VIEWER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StockMovement.userId is NOT NULL, and the table may already have rows.
-- Same three steps as Stage 3: add nullable, backfill, then enforce.

-- 1. Nullable, because a NOT NULL column with no default cannot be added to a
--    table that already has rows.
ALTER TABLE "StockMovement" ADD COLUMN "userId" INTEGER;

-- 2. Backfill to a dedicated system account. Attributing historical movements
--    to a real person would be inventing evidence, which is the one thing an
--    audit trail must never do. The hash is a literal that argon2 can never
--    produce, so nobody can log in as this account.
INSERT INTO "User" ("email", "passwordHash", "role", "createdAt", "updatedAt")
SELECT 'system@internal', 'x-not-a-valid-hash', 'ADMIN', NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "StockMovement" WHERE "userId" IS NULL);

UPDATE "StockMovement"
SET "userId" = (SELECT id FROM "User" WHERE email = 'system@internal')
WHERE "userId" IS NULL;

-- 3. Every row now has a value, so the constraint can be enforced.
ALTER TABLE "StockMovement" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "StockMovement_userId_createdAt_idx" ON "StockMovement"("userId", "createdAt");
