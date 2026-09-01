import { prisma } from "../lib/prisma.js";

// Services return domain data or null. The HTTP shape is the controller's job:
// wrapping null in { data: null } made "not found" indistinguishable from "found".

export const getAllWarehouses = async () => {
    const warehouses = await prisma.warehouse.findMany({ where: { deletedAt: null }});
    return warehouses;
};

export const getWarehouseById = async (id) => {
    const warehouse = await prisma.warehouse.findFirst({ where: { id, deletedAt: null }});
    return warehouse;
};

export const createWarehouse = async ({ name, location }) => {
    const warehouse = await prisma.warehouse.create({ data: { name, location }});
    return warehouse;
};

export const updateWarehouse = async (id, { name, location }) => {
    const updatedWarehouse = await prisma.warehouse.update({ where: { id, deletedAt: null }, data: { name, location }});
    return updatedWarehouse;
};

export const deleteWarehouse = async (id) => {
    const deletedWarehouse = await prisma.warehouse.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date() }});
    return deletedWarehouse;
};
