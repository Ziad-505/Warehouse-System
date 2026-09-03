import { z } from "zod";

import { registerBody, loginBody, refreshBody } from "../schemas/authSchema.js";
import { createCategoryBody, updateCategoryBody, categoryListQuery } from "../schemas/categorySchema.js";
import { createWarehouseBody, updateWarehouseBody, warehouseListQuery } from "../schemas/warehouseSchema.js";
import { createProductBody, updateProductBody, productListQuery } from "../schemas/productSchema.js";
import { createMovementBody, transferBody, movementListQuery } from "../schemas/movementSchema.js";

// Anything that fails to convert lands here instead of throwing. Generating
// documentation must never be able to take the API down -- and a test asserts
// this array is empty, so a silent failure still gets caught.
export const conversionErrors = [];

const toSchema = (name, schema) => {
    try {
        // io: "input" describes what a client sends, before coercion and
        // defaults are applied. unrepresentable: "any" keeps types with no JSON
        // Schema equivalent (dates, custom refinements) from throwing.
        return z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
    } catch (error) {
        conversionErrors.push({ name, message: error.message });
        return { type: "object" };
    }
};

// Query schemas become individual OpenAPI parameters rather than one body.
const toQueryParams = (name, schema) => {
    const json = toSchema(name, schema);
    const properties = json.properties ?? {};
    const required = json.required ?? [];
    return Object.entries(properties).map(([key, value]) => ({
        name: key,
        in: "query",
        required: required.includes(key),
        schema: value,
    }));
};

const idParam = {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "integer", minimum: 1 },
};

const jsonBody = (name, schema) => ({
    required: true,
    content: { "application/json": { schema: toSchema(name, schema) } },
});

const ok = (description) => ({ description });
const errorRef = { $ref: "#/components/schemas/Error" };
const err = (description) => ({
    description,
    content: { "application/json": { schema: errorRef } },
});

const commonErrors = {
    400: err("Validation failed"),
    401: err("Authentication required"),
    403: err("Insufficient role"),
    404: err("Not found"),
    429: err("Rate limited"),
};

// A resource with the same five endpoints as the others.
const crudPaths = (base, tag, { listQuery, createBody, updateBody, queryName }) => ({
    [base]: {
        get: {
            tags: [tag],
            summary: `List ${tag.toLowerCase()}`,
            parameters: toQueryParams(queryName, listQuery),
            responses: { 200: ok("Paginated list"), ...commonErrors },
        },
        post: {
            tags: [tag],
            summary: `Create a ${tag.toLowerCase().replace(/s$/, "")}`,
            requestBody: jsonBody(`${queryName}Create`, createBody),
            responses: { 201: ok("Created"), 409: err("Already exists"), ...commonErrors },
        },
    },
    [`${base}/{id}`]: {
        get: {
            tags: [tag],
            parameters: [idParam],
            responses: { 200: ok("Found"), ...commonErrors },
        },
        patch: {
            tags: [tag],
            parameters: [idParam],
            requestBody: jsonBody(`${queryName}Update`, updateBody),
            responses: { 200: ok("Updated"), ...commonErrors },
        },
        delete: {
            tags: [tag],
            summary: "ADMIN only",
            parameters: [idParam],
            responses: { 200: ok("Soft-deleted"), ...commonErrors },
        },
    },
});

export const buildOpenApiDocument = () => {
    conversionErrors.length = 0;

    return {
        openapi: "3.1.0",
        info: {
            title: "Warehouse System API",
            version: "1.0.0",
            description:
                "Multi-warehouse inventory: per-warehouse stock levels, audited movements " +
                "and transfers, JWT authentication with role-based access.\n\n" +
                "Request schemas here are generated from the same Zod schemas the server " +
                "validates with, so the documentation cannot drift from the behaviour.",
        },
        servers: [{ url: "/" }],
        components: {
            securitySchemes: {
                bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
            },
            schemas: {
                Error: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                        details: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: { field: { type: "string" }, message: { type: "string" } },
                            },
                        },
                    },
                    required: ["error"],
                },
            },
        },
        // Applies to every operation unless overridden with `security: []`.
        security: [{ bearerAuth: [] }],
        tags: [
            { name: "Auth" },
            { name: "Health" },
            { name: "Categories" },
            { name: "Warehouses" },
            { name: "Products" },
            { name: "Stock movements" },
        ],
        paths: {
            "/api/health": {
                get: {
                    tags: ["Health"],
                    summary: "Liveness plus a database round trip",
                    security: [],
                    responses: { 200: ok("Database reachable"), 503: ok("Database unreachable") },
                },
            },

            "/api/auth/register": {
                post: {
                    tags: ["Auth"],
                    security: [],
                    requestBody: jsonBody("register", registerBody),
                    responses: { 201: ok("User created"), 409: err("Email taken"), ...commonErrors },
                },
            },
            "/api/auth/login": {
                post: {
                    tags: ["Auth"],
                    summary: "Returns a 15 minute access token and a 7 day refresh token",
                    security: [],
                    requestBody: jsonBody("login", loginBody),
                    responses: { 200: ok("Tokens issued"), 401: err("Invalid credentials"), ...commonErrors },
                },
            },
            "/api/auth/refresh": {
                post: {
                    tags: ["Auth"],
                    summary: "Rotates the refresh token and issues a new access token",
                    security: [],
                    requestBody: jsonBody("refresh", refreshBody),
                    responses: { 200: ok("New tokens"), 401: err("Invalid or spent token"), ...commonErrors },
                },
            },
            "/api/auth/logout": {
                post: {
                    tags: ["Auth"],
                    summary: "Revokes the refresh token",
                    security: [],
                    requestBody: jsonBody("logout", refreshBody),
                    responses: { 204: ok("Revoked"), ...commonErrors },
                },
            },

            ...crudPaths("/api/categories", "Categories", {
                listQuery: categoryListQuery,
                createBody: createCategoryBody,
                updateBody: updateCategoryBody,
                queryName: "category",
            }),
            ...crudPaths("/api/warehouses", "Warehouses", {
                listQuery: warehouseListQuery,
                createBody: createWarehouseBody,
                updateBody: updateWarehouseBody,
                queryName: "warehouse",
            }),
            ...crudPaths("/api/products", "Products", {
                listQuery: productListQuery,
                createBody: createProductBody,
                updateBody: updateProductBody,
                queryName: "product",
            }),

            "/api/warehouses/{id}/stock": {
                get: {
                    tags: ["Warehouses"],
                    summary: "What this warehouse is currently holding",
                    parameters: [idParam, ...toQueryParams("warehouseStock", warehouseListQuery)],
                    responses: { 200: ok("Paginated stock levels"), ...commonErrors },
                },
            },

            "/api/stock-movements": {
                get: {
                    tags: ["Stock movements"],
                    summary: "Audit trail, newest first",
                    parameters: toQueryParams("movementList", movementListQuery),
                    responses: { 200: ok("Paginated movements"), ...commonErrors },
                },
                post: {
                    tags: ["Stock movements"],
                    summary: "IN, OUT or ADJUST at one warehouse. STAFF or ADMIN",
                    requestBody: jsonBody("movementCreate", createMovementBody),
                    responses: {
                        201: ok("Movement recorded"),
                        409: err("Insufficient stock"),
                        ...commonErrors,
                    },
                },
            },
            "/api/stock-movements/transfer": {
                post: {
                    tags: ["Stock movements"],
                    summary: "Move stock between warehouses in one transaction. STAFF or ADMIN",
                    requestBody: jsonBody("transfer", transferBody),
                    responses: {
                        201: ok("Both movements recorded"),
                        409: err("Insufficient stock at the source"),
                        ...commonErrors,
                    },
                },
            },
        },
    };
};
