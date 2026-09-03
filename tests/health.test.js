import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("GET /api/health", () => {
    it("reports the database is reachable", async () => {
        const res = await request(app).get("/api/health");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: "ok", database: "up" });
    });

    it("stays public", async () => {
        const res = await request(app).get("/api/health");
        expect(res.status).not.toBe(401);
    });
});

describe("hardening", () => {
    it("sets helmet's defensive headers", async () => {
        const res = await request(app).get("/api/health");

        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["x-frame-options"]).toBeDefined();
        // helmet removes this one -- it advertises the stack to attackers.
        expect(res.headers["x-powered-by"]).toBeUndefined();
    });

    it("returns a request id so a client can quote it in a bug report", async () => {
        const res = await request(app).get("/api/health");
        expect(res.headers["x-request-id"]).toBeTypeOf("string");
    });

    it("reuses an inbound request id instead of minting a new one", async () => {
        const res = await request(app)
            .get("/api/health")
            .set("x-request-id", "trace-me-12345");

        expect(res.headers["x-request-id"]).toBe("trace-me-12345");
    });

    it("rejects a body larger than the cap", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .set("Content-Type", "application/json")
            .send(JSON.stringify({ email: "a@b.com", password: "x".repeat(200_000) }));

        expect(res.status).toBe(413);
    });
});
