import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { signAccessToken } from "../src/lib/tokens.js";
import { api, anon } from "./helpers.js";
import { makeUser, makeWarehouse, makeProduct, makeStockLevel } from "./factories.js";

const credentials = { email: "ziad@example.com", password: "a-long-enough-password" };

describe("POST /api/auth/register", () => {
    it("creates a user and never returns the hash", async () => {
        const res = await anon().post("/api/auth/register").send(credentials);

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ email: credentials.email, role: "STAFF" });
        // The whole security posture of this endpoint is one `select`.
        expect(res.body.passwordHash).toBeUndefined();
    });

    it("stores an argon2 hash, not the password", async () => {
        await anon().post("/api/auth/register").send(credentials);
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });

        expect(user.passwordHash).not.toBe(credentials.password);
        expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
    });

    it("lowercases the email so casing cannot create a second account", async () => {
        await anon().post("/api/auth/register").send(credentials);
        const res = await anon()
            .post("/api/auth/register")
            .send({ ...credentials, email: "ZIAD@example.com" });

        expect(res.status).toBe(409);
    });

    it("rejects a short password", async () => {
        const res = await anon().post("/api/auth/register").send({ ...credentials, password: "short" });
        expect(res.status).toBe(400);
    });
});

describe("POST /api/auth/login", () => {
    it("returns an access token and a refresh token", async () => {
        await anon().post("/api/auth/register").send(credentials);
        const res = await anon().post("/api/auth/login").send(credentials);

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTypeOf("string");
        expect(res.body.refreshToken).toBeTypeOf("string");
        expect(res.body.user.email).toBe(credentials.email);
    });

    // Same message either way, or the response tells an attacker which emails
    // are registered.
    it("gives the same error for a wrong password and an unknown email", async () => {
        await anon().post("/api/auth/register").send(credentials);

        const wrongPassword = await anon()
            .post("/api/auth/login")
            .send({ ...credentials, password: "definitely-not-the-password" });
        const unknownEmail = await anon()
            .post("/api/auth/login")
            .send({ email: "nobody@example.com", password: credentials.password });

        expect(wrongPassword.status).toBe(401);
        expect(unknownEmail.status).toBe(401);
        expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
    });
});

describe("requireAuth", () => {
    it("401s with no token", async () => {
        const res = await anon().get("/api/categories");
        expect(res.status).toBe(401);
    });

    it("401s with a malformed token", async () => {
        const res = await anon().get("/api/categories").set("Authorization", "Bearer nonsense");
        expect(res.status).toBe(401);
    });

    it("401s when the scheme is not Bearer", async () => {
        const res = await anon()
            .get("/api/categories")
            .set("Authorization", `Token ${globalThis.__ADMIN_TOKEN__}`);
        expect(res.status).toBe(401);
    });

    it("401s on an expired token", async () => {
        const { user } = await makeUser("ADMIN");
        const expired = signAccessToken(user, { expiresIn: "-1s" });
        const res = await anon().get("/api/categories").set("Authorization", `Bearer ${expired}`);
        expect(res.status).toBe(401);
    });

    it("200s with a valid token", async () => {
        const res = await api().get("/api/categories");
        expect(res.status).toBe(200);
    });
});

describe("requireRole", () => {
    it("403s a VIEWER attempting a delete, and leaves the record alone", async () => {
        const warehouse = await makeWarehouse();
        const { token } = await makeUser("VIEWER");

        const res = await api(token).delete(`/api/warehouses/${warehouse.id}`);

        expect(res.status).toBe(403);
        // A 403 that deleted the row anyway is the bug worth catching.
        const still = await prisma.warehouse.findUnique({ where: { id: warehouse.id } });
        expect(still.deletedAt).toBeNull();
    });

    it("403s a STAFF attempting a delete", async () => {
        const warehouse = await makeWarehouse();
        const { token } = await makeUser("STAFF");
        const res = await api(token).delete(`/api/warehouses/${warehouse.id}`);
        expect(res.status).toBe(403);
    });

    it("lets an ADMIN delete", async () => {
        const warehouse = await makeWarehouse();
        const { token } = await makeUser("ADMIN");
        const res = await api(token).delete(`/api/warehouses/${warehouse.id}`);
        expect(res.status).toBe(200);
    });

    it("lets a VIEWER read", async () => {
        const { token } = await makeUser("VIEWER");
        const res = await api(token).get("/api/warehouses");
        expect(res.status).toBe(200);
    });
});

describe("POST /api/auth/refresh", () => {
    it("exchanges a refresh token for a new access token", async () => {
        await anon().post("/api/auth/register").send(credentials);
        const login = await anon().post("/api/auth/login").send(credentials);

        const res = await anon()
            .post("/api/auth/refresh")
            .send({ refreshToken: login.body.refreshToken });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTypeOf("string");
    });

    // Rotation: a spent token must not work twice.
    it("refuses a refresh token that has already been used", async () => {
        await anon().post("/api/auth/register").send(credentials);
        const login = await anon().post("/api/auth/login").send(credentials);
        const first = { refreshToken: login.body.refreshToken };

        await anon().post("/api/auth/refresh").send(first);
        const second = await anon().post("/api/auth/refresh").send(first);

        expect(second.status).toBe(401);
    });

    it("refuses a refresh token after logout", async () => {
        await anon().post("/api/auth/register").send(credentials);
        const login = await anon().post("/api/auth/login").send(credentials);
        const body = { refreshToken: login.body.refreshToken };

        const out = await anon().post("/api/auth/logout").send(body);
        expect(out.status).toBe(204);

        const res = await anon().post("/api/auth/refresh").send(body);
        expect(res.status).toBe(401);
    });
});

describe("audit attribution", () => {
    it("records the token holder as the author of a movement", async () => {
        const { user, token } = await makeUser("STAFF");
        const warehouse = await makeWarehouse();
        const product = await makeProduct();

        const res = await api(token).post("/api/stock-movements").send({
            productId: product.id,
            warehouseId: warehouse.id,
            type: "IN",
            quantity: 5,
        });

        expect(res.status).toBe(201);
        const movement = await prisma.stockMovement.findFirst({ where: { productId: product.id } });
        expect(movement.userId).toBe(user.id);
    });

    // The single most important property in this stage: identity comes from the
    // signature, never from the payload. strictObject is what enforces it.
    it("refuses a body that tries to attribute the movement to someone else", async () => {
        const { token } = await makeUser("STAFF");
        const other = await makeUser("STAFF");
        const warehouse = await makeWarehouse();
        const product = await makeProduct();

        const res = await api(token).post("/api/stock-movements").send({
            productId: product.id,
            warehouseId: warehouse.id,
            type: "IN",
            quantity: 5,
            userId: other.user.id,
        });

        expect(res.status).toBe(400);
    });

    it("attributes both halves of a transfer", async () => {
        const { user, token } = await makeUser("STAFF");
        const product = await makeProduct();
        const from = await makeWarehouse();
        const to = await makeWarehouse();
        await makeStockLevel(product.id, from.id, 40);

        await api(token).post("/api/stock-movements/transfer").send({
            productId: product.id,
            fromWarehouseId: from.id,
            toWarehouseId: to.id,
            quantity: 10,
        });

        const movements = await prisma.stockMovement.findMany({ where: { productId: product.id } });
        expect(movements).toHaveLength(2);
        expect(movements.every((m) => m.userId === user.id)).toBe(true);
    });
});
