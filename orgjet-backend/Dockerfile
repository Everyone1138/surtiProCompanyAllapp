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

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

# prisma needs access at runtime if you use migrations or seed; adjust as needed
# RUN npx prisma migrate deploy  # usually run at container start if desired

EXPOSE 3000
CMD ["node", "dist/main.js"]
