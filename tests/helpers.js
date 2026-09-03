import request from "supertest";
import app from "../src/app.js";

const wrap = (r, token) => r.set("Authorization", `Bearer ${token}`);

// A supertest client that is already authenticated. Defaults to the admin that
// setup.js creates; pass a token to act as somebody else.
export const api = (token = globalThis.__ADMIN_TOKEN__) => ({
    get: (url) => wrap(request(app).get(url), token),
    post: (url) => wrap(request(app).post(url), token),
    patch: (url) => wrap(request(app).patch(url), token),
    delete: (url) => wrap(request(app).delete(url), token),
});

// Unauthenticated, for the tests that are about being turned away.
export const anon = () => request(app);
