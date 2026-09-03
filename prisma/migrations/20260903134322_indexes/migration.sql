-- Postgres indexes the REFERENCED side of a foreign key (it needs that to check
-- the constraint) but never the referencing column -- which is the one queries
-- actually filter on. MySQL does this automatically; Postgres does not.

-- Every product read joins its category.
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- Movement history is always asked for as "for this product/warehouse, newest
-- first". Leading column = the equality filter, second = the sort. That order
-- lets one index serve both the filter and the ORDER BY.
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");
CREATE INDEX "StockMovement_warehouseId_createdAt_idx" ON "StockMovement"("warehouseId", "createdAt");
