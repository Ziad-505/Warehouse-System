# node:*-slim (Debian) rather than alpine: argon2 is a native module and its
# prebuilt binaries cover glibc far better than musl. Alpine would mean either a
# node-gyp toolchain in the image or a build that fails on someone else's machine.

# --- deps: exactly what the app needs at runtime ----------------------------
FROM node:24-slim AS deps
WORKDIR /app
COPY package*.json ./
# Scripts are NOT ignored here on purpose: argon2 unpacks its prebuilt binary
# and @prisma/engines fetches the schema engine that `migrate deploy` needs.
RUN npm ci --omit=dev

# --- build: generate the Prisma client --------------------------------------
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npx prisma generate

# --- runtime -----------------------------------------------------------------
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/generated    ./generated
COPY package*.json prisma7.config.ts ./
COPY prisma ./prisma
COPY src ./src

# The node image ships a non-root `node` user. A container escape that starts as
# root is a very different incident from one that starts unprivileged.
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]
