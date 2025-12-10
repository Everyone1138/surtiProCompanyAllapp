# ----- base -----
FROM node:20-alpine AS base
WORKDIR /app
# tools some steps may need
RUN apk add --no-cache openssl

# ----- install_deps -----
FROM base AS install_deps
# only package manifests + prisma first to leverage build cache
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts

# ----- build_app -----
FROM base AS build_app
# bring installed deps
COPY --from=install_deps /app/node_modules ./node_modules
# copy the rest needed to build
COPY package*.json ./
COPY tsconfig*.json ./
COPY src ./src
COPY prisma ./prisma
# prisma client + build
RUN npx prisma generate
RUN npm run build
# drop dev deps so runtime is smaller
RUN npm prune --omit=dev

# ----- runtime -----
FROM node:20-alpine AS runtime
WORKDIR /app
# healthcheck tool
RUN apk add --no-cache curl

# copy build outputs and runtime deps; use existing 'node' user ownership
COPY --from=build_app --chown=node:node /app/node_modules ./node_modules
COPY --from=build_app --chown=node:node /app/dist ./dist
COPY --chown=node:node prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3000

# switch to the pre-existing 'node' user in the node:alpine image
USER node

EXPOSE 3000
CMD ["node","dist/main.js"]

# reliable healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/health || exit 1
