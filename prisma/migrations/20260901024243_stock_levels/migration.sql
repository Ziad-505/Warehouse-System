-- Move stock from Product onto a Product x Warehouse join table.
--
-- Statement order is load-bearing: everything that READS Product.quantity or
-- Product."warehouseId" must run before those columns are dropped at the end.

-- 1. The new table. Nothing is destroyed yet.
CREATE TABLE "StockLevel" (
    "productId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("productId","warehouseId")
);

-- The composite PK indexes (productId, warehouseId). Filtering by warehouse
-- alone cannot use it, because warehouseId is not the leading column.
CREATE INDEX "StockLevel_warehouseId_idx" ON "StockLevel"("warehouseId");

-- 2. Carry the existing stock across BEFORE the source columns disappear.
INSERT INTO "StockLevel" ("productId", "warehouseId", "quantity", "createdAt", "updatedAt")
SELECT id, "warehouseId", quantity, NOW(), NOW()
FROM "Product"
WHERE "warehouseId" IS NOT NULL;

-- 3. StockMovement.warehouseId: add nullable, backfill, then enforce.
--    A NOT NULL column with no default cannot be added to a populated table.
ALTER TABLE "StockMovement" ADD COLUMN "warehouseId" INTEGER;

UPDATE "StockMovement" sm
SET "warehouseId" = p."warehouseId"
FROM "Product" p
WHERE sm."productId" = p.id AND p."warehouseId" IS NOT NULL;

-- Any movement whose product had no warehouse cannot be attributed to one.
DELETE FROM "StockMovement" WHERE "warehouseId" IS NULL;

ALTER TABLE "StockMovement" ALTER COLUMN "warehouseId" SET NOT NULL;

-- 4. quantityBefore / quantityAfter have no historical source. Add them with a
--    temporary default so existing rows get a value, then drop the default so
--    future inserts must supply one -- matching the schema, which has none.
ALTER TABLE "StockMovement" ADD COLUMN "quantityBefore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StockMovement" ADD COLUMN "quantityAfter" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StockMovement" ALTER COLUMN "quantityBefore" DROP DEFAULT;
ALTER TABLE "StockMovement" ALTER COLUMN "quantityAfter" DROP DEFAULT;

-- 5. Foreign keys.
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Last of all, drop what nothing needs any more.
ALTER TABLE "Product" DROP CONSTRAINT "Product_warehouseId_fkey";
ALTER TABLE "Product" DROP COLUMN "quantity";
ALTER TABLE "Product" DROP COLUMN "warehouseId";
