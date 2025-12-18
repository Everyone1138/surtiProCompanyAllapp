# ---- Builder: install deps, generate Prisma client, compile Nest ----
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install OS deps (just in case native modules need build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

# Copy only what’s needed to install and build
COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

# Generate Prisma client (uses prisma/schema.prisma)
RUN npx prisma generate

# Copy the rest and build Nest -> dist/
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Prune dev dependencies to shrink runtime
RUN npm prune --omit=dev

# ---- Runtime: slim image with prod node_modules + dist ----
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Allow local dev front-end to talk to the API during tests
ENV CORS_ORIGIN=http://localhost:5173

# Copy production node_modules and compiled app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Optional: keep schema for debugging (not required at runtime)
COPY --from=builder /app/prisma ./prisma
# If you serve uploads locally:
# RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

EXPOSE 3000
CMD ["node", "dist/main.js"]



