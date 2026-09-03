# --- deps: production node_modules only -------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
# --ignore-scripts because npm blocks lifecycle scripts by default now anyway,
# and we run prisma generate explicitly in the next stage.
RUN npm ci --omit=dev --ignore-scripts

# --- build: generate the Prisma client (needs the prisma CLI, a devDependency)
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npx prisma generate

# --- runtime: only what is needed to run ------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/generated    ./generated
COPY package*.json prisma7.config.ts ./
COPY prisma ./prisma
COPY src ./src

# The node image ships a non-root `node` user. Running as root inside a
# container means a container escape starts with root on the host.
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]
