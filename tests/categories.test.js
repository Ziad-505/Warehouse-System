import { describe, it, expect } from "vitest";
import { api } from "./helpers.js";

describe("POST /api/categories", () => {
    it("creates a category", async () => {
        const res = await api()
            .post("/api/categories")
            .send({ name: "Tools" });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ name: "Tools" });
        expect(res.body.id).toBeTypeOf("number");
    });

    it("trims whitespace off the name", async () => {
        const res = await api()
            .post("/api/categories")
            .send({ name: "  Tools  " });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe("Tools");
    });

    it("rejects an empty body", async () => {
        const res = await api().post("/api/categories").send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Validation failed");
        expect(res.body.details[0].field).toBe("name");
    });

    it("rejects an unknown key", async () => {
        const res = await api()
            .post("/api/categories")
            .send({ nmae: "Tools" });

        expect(res.status).toBe(400);
    });

    it("rejects a duplicate name with 409", async () => {
        await api().post("/api/categories").send({ name: "Tools" });
        const res = await api().post("/api/categories").send({ name: "Tools" });

        expect(res.status).toBe(409);
    });
});

describe("GET /api/categories/:id", () => {
    it("coerces a numeric id", async () => {
        const created = await api().post("/api/categories").send({ name: "Tools" });
        const res = await api().get(`/api/categories/${created.body.id}`);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe("Tools");
    });

    it("rejects a non-numeric id with 400", async () => {
        const res = await api().get("/api/categories/abc");
        expect(res.status).toBe(400);
    });

    it("returns 404 for an id that does not exist", async () => {
        const res = await api().get("/api/categories/999999");
        expect(res.status).toBe(404);
    });
});