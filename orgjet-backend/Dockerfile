# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
# Prisma likes openssl; curl not needed here
RUN apk add --no-cache openssl

# ---------- deps ----------
FROM base AS install_deps
COPY package*.json ./
COPY prisma ./prisma
# Avoid triggering postinstall here
RUN npm ci --ignore-scripts

# ---------- build ----------
FROM base AS build_app
# bring installed modules
COPY --from=install_deps /app/node_modules ./node_modules

# 👇 THIS LINE FIXES YOUR ERROR
COPY package*.json ./         

# your build-time files
COPY tsconfig*.json ./
# If you use Nest/Nx/etc., include their config as needed:
# COPY nest-cli.json ./
# COPY nx.json ./
# COPY package-lock.json ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build

# shrink deps for runtime
RUN npm prune --omit=dev

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN apk add --no-cache curl

COPY --from=build_app /app/node_modules ./node_modules
COPY --from=build_app /app/dist ./dist
# Keep Prisma schema only if your app needs it at runtime (migrations, etc.)
COPY --from=build_app /app/prisma ./prisma

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1
CMD ["node","dist/main.js"]