import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const categories = [{ name: "Tools" }, { name: "Electronics" }, { name: "Consumables" }];

const warehouses = [
    { name: "Main", location: "Cairo" },
    { name: "Overflow", location: "Giza" },
];

// Stock is a fact about a (product, warehouse) pair now, so it sits beside the
// product rather than on it. Hammer and Packing Tape are deliberately in BOTH
// warehouses -- the case the old schema could not represent at all.
const products = [
    { name: "Hammer",        price: "99.50",   category: "Tools",       stock: { Main: 40,  Overflow: 15 } },
    { name: "Screwdriver",   price: "45.00",   category: "Tools",       stock: { Main: 120 } },
    { name: "Label Printer", price: "2350.00", category: "Electronics", stock: { Overflow: 6 } },
    { name: "Packing Tape",  price: "12.75",   category: "Consumables", stock: { Main: 500, Overflow: 200 } },
];

const seed = async () => {
    // Children before parents, or the foreign keys refuse the delete.
    await prisma.stockMovement.deleteMany({});
    await prisma.stockLevel.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.warehouse.deleteMany({});

    const categoryByName = new Map();
    for (const data of categories) {
        categoryByName.set(data.name, await prisma.category.create({ data }));
    }

    const warehouseByName = new Map();
    for (const data of warehouses) {
        warehouseByName.set(data.name, await prisma.warehouse.create({ data }));
    }

    let levels = 0;
    for (const { category, stock, ...data } of products) {
        const product = await prisma.product.create({
            data: { ...data, categoryId: categoryByName.get(category).id },
        });

        // Written straight to StockLevel rather than through the movement
        // service: these are fixtures, not things a user did, so inventing an
        // audit trail for them would be a lie.
        for (const [warehouseName, quantity] of Object.entries(stock)) {
            await prisma.stockLevel.create({
                data: {
                    productId: product.id,
                    warehouseId: warehouseByName.get(warehouseName).id,
                    quantity,
                },
            });
            levels += 1;
        }
    }

    console.log(
        `Seeded ${categories.length} categories, ${warehouses.length} warehouses, ` +
            `${products.length} products, ${levels} stock levels.`
    );
};

seed()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
