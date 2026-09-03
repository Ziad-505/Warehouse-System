import { prisma } from "../lib/prisma.js";

// Services return domain data or null. The HTTP shape is the controller's job.

export const getAllWarehouses = async ({ page, limit, search }) => {
    const where = {
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const [data, total] = await Promise.all([
        prisma.warehouse.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { id: "asc" },
        }),
        prisma.warehouse.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
};

export const getWarehouseById = async (id) =>
    prisma.warehouse.findFirst({ where: { id, deletedAt: null } });

// The endpoint the whole refactor existed for: what is actually in this place.
export const getWarehouseStock = async (id, { page, limit }) => {
    const where = { warehouseId: id, product: { deletedAt: null } };
    const [data, total] = await Promise.all([
        prisma.stockLevel.findMany({
            where,
            select: {
                quantity: true,
                product: { select: { id: true, name: true, price: true } },
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { productId: "asc" },
        }),
        prisma.stockLevel.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
};

export const createWarehouse = async ({ name, location }) =>
    prisma.warehouse.create({ data: { name, location } });

export const updateWarehouse = async (id, { name, location }) =>
    prisma.warehouse.update({ where: { id, deletedAt: null }, data: { name, location } });

export const deleteWarehouse = async (id) =>
    prisma.warehouse.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
