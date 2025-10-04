# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
# Needed by Prisma on alpine + for healthcheck
RUN apk add --no-cache openssl curl

# ---------- deps (install with dev deps for build) ----------
FROM base AS deps
COPY package*.json ./
# If you rely on postinstall prisma generate, keep prisma folder here too:
COPY prisma ./prisma
RUN npm ci

# ---------- build (compile TS, generate prisma client) ----------
FROM deps AS build
# Copy the rest only now to maximize layer cache
COPY tsconfig*.json ./
COPY src ./src
# If you have other build-time files (nest-cli.json, .env.example, etc.), copy them too.
# COPY nest-cli.json ./

# Build your app (e.g., tsc or nest build)
RUN npm run build

# Prisma client baked into node_modules for the final image
RUN npx prisma generate

# Strip devDependencies for smaller runtime
RUN npm prune --omit=dev

# ---------- runtime (lean) ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
RUN apk add --no-cache curl

# Non-root for security
RUN addgroup -S nodejs && adduser -S node -G nodejs

# Copy pruned node_modules and built dist only
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Keep prisma folder (migrations/schema) if your app reads it at runtime
COPY prisma ./prisma

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1
CMD ["node","dist/main.js"]
