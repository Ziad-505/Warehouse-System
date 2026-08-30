import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const categories = [{ name: "Tools" }, { name: "Electronics" }, { name: "Consumables" }];
const warehouses = [{ name: "Main", location: "Cairo" }, { name: "Overflow", location: "Giza" }];
const products = [
    { name: "Hammer", price: "99.50", quantity: 40, category: "Tools", warehouse: "Main" },
    { name: "Screwdriver", price: "45.00", quantity: 120, category: "Tools", warehouse: "Main" },
    { name: "Label Printer", price: "2350.00", quantity: 6, category: "Electronics", warehouse: "Overflow" },
    { name: "Packing Tape", price: "12.75", quantity: 500, category: "Consumables", warehouse: "Main" },
];

const seed = async () => {
    await prisma.stockMovement.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.warehouse.deleteMany({});

    const categoryByName = new Map();
    for (const data of categories) categoryByName.set(data.name, await prisma.category.create({ data }));

    const warehouseByName = new Map();
    for (const data of warehouses) warehouseByName.set(data.name, await prisma.warehouse.create({ data }));

    for (const { category, warehouse, ...data } of products) {
        await prisma.product.create({
            data: { ...data, categoryId: categoryByName.get(category).id, warehouseId: warehouseByName.get(warehouse).id },
        });
    }

    console.log(`Seeded ${categories.length} categories, ${warehouses.length} warehouses, ${products.length} products.`);
};

seed()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
