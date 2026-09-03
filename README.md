# Warehouse System

[![CI](https://github.com/Ziad-505/Warehouse-System/actions/workflows/ci.yml/badge.svg)](https://github.com/Ziad-505/Warehouse-System/actions/workflows/ci.yml)

Inventory API for multi-warehouse stock: products, per-warehouse stock levels,
audited stock movements and transfers, with JWT authentication and role-based
access.

Node 22+ · Express 5 · PostgreSQL 17 · Prisma 7 · Zod 4 · Vitest

## Quick start

```bash
docker compose up -d          # PostgreSQL on :5432
cp .env.example .env          # then fill in JWT_SECRET
npm install
npm run migrate               # applies migrations + generates the client
npm run seed
npm run dev
```

Interactive API docs at `http://localhost:3000/api/docs`.

## API

| | |
|---|---|
| `POST /api/auth/register` · `/login` · `/refresh` · `/logout` | public |
| `GET /api/health` | public — returns 503 if the database is unreachable |
| `GET /api/{categories,warehouses,products}` | any authenticated user |
| `GET /api/warehouses/:id/stock` | stock held at one warehouse |
| `GET /api/stock-movements` | audit trail, filterable by product, warehouse, user, type, date |
| `POST /api/stock-movements` | `IN` · `OUT` · `ADJUST` — STAFF or ADMIN |
| `POST /api/stock-movements/transfer` | between warehouses, atomic — STAFF or ADMIN |
| `DELETE /api/*` | ADMIN only |

All collections are paginated and return `{ data, meta: { page, limit, total } }`.

## Design notes

**Stock belongs to the relationship, not the product.** Quantity lives on a
`StockLevel` join table keyed `@@id([productId, warehouseId])`, so the database
itself guarantees one row per product per warehouse. Products carry no quantity.

**Stock only moves through movements.** `POST /api/products` rejects a
`quantity` field. Every change writes a `StockMovement` recording the type,
amount, `quantityBefore`, `quantityAfter`, and the authenticated user — so the
audit trail is complete by construction rather than by discipline.

**Concurrency is handled in the database, not in JavaScript.** An `OUT` movement
issues a conditional update — `WHERE quantity >= n` inside a transaction — and
treats zero affected rows as insufficient stock. Under `READ COMMITTED` Postgres
re-evaluates that predicate after the row lock is released, so the check cannot
go stale between read and write. Twenty concurrent requests against ten units of
stock produce exactly ten successes, ten `409`s, and a final quantity of zero.
There is a test that asserts precisely that.

**Transfers are one transaction, and their writes are ordered.** A transfer is an
`OUT` and an `IN`; either both commit or neither does. The two writes are sorted
by `warehouseId` so that two transfers running in opposite directions acquire
locks in the same order and cannot deadlock.

**Validation is a boundary, not a habit.** Zod schemas parse and coerce `params`,
`body` and `query` in middleware, writing the result to `req.valid`. Past that
line the services trust their input — no defensive type checks, no `Number(id)`.
Schemas are strict, so unknown keys are rejected rather than ignored.

**Identity comes from the signature.** `userId` on a movement is read from
`req.user`, set by verifying the JWT — never from the request body. Access
tokens are short-lived; refresh tokens are stored hashed and rotate on use, so
logout can actually revoke something.

**Errors have one exit.** A single error middleware turns `AppError`, Prisma
error codes and `http-errors`-shaped library errors into consistent JSON.
Unexpected errors are logged in full and answered with a generic 500.

## Testing

```bash
docker exec warehouse-db createdb -U warehouse warehouse_test
cp .env .env.test    # point DATABASE_URL at warehouse_test
npm test
```

87 tests against a real PostgreSQL instance — no mocked database, since the bugs
worth catching live in the gap between the code and the database. Tables are
truncated before each test, so any test can run alone and in any order. CI runs
the suite on every pull request.

## Layout

```
src/
  routes/       HTTP surface: paths, auth guards, validation
  controllers/  request/response only — never touches Prisma
  services/     domain logic and transactions — never sees req/res
  schemas/      Zod, the trust boundary
  middleware/   validate, auth, rate limiting, logging, errors
  lib/          Prisma client, tokens, password hashing, env, logger
prisma/         schema + hand-written migrations
tests/          Vitest + Supertest
```

## Deployment

`Dockerfile` is multi-stage and runs as a non-root user. The server handles
`SIGTERM` by draining in-flight requests before disconnecting Prisma, so a
redeploy does not drop live transactions.
