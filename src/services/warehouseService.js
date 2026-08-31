import { prisma } from "../lib/prisma.js";

export const getAllWarehouses = async () => {
    const warehouses = await prisma.warehouse.findMany({ where: { deletedAt: null }});
    return { data: warehouses };
};

export const getWarehouseById = async (id) => {
    const wareHouse = await prisma.warehouse.findFirst({ where: { id, deletedAt: null }});
    return { data: wareHouse };
};

export const createWarehouse = async ({ name, location }) => {
    const wareHouse = await prisma.warehouse.create({ data: { name, location }});
    return { data: wareHouse };
};

export const updateWarehouse = async (id, { name, location }) => {
    const updatedWarehouse = await prisma.warehouse.update({ where: { id, deletedAt: null }, data: { name, location }});
    return { data: updatedWarehouse };
};

export const deleteWarehouse = async (id) => {
    const deletedWarehouse = await prisma.warehouse.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date() }});
    return { data: deletedWarehouse };
};


