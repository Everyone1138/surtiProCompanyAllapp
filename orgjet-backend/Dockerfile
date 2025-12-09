# ----- base -----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ----- deps -----
FROM base AS install_deps
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts

# ----- build -----
FROM base AS build_app
COPY --from=install_deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig*.json ./
COPY src ./src
COPY prisma ./prisma
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# ----- runtime -----
FROM node:20-alpine AS runtime
WORKDIR /app
# install curl for healthcheck
RUN apk add --no-cache curl

# non-root
RUN addgroup -S nodejs && adduser -S node -G nodejs

COPY --from=build_app /app/node_modules ./node_modules
COPY --from=build_app /app/dist ./dist
COPY prisma ./prisma
ENV NODE_ENV=production PORT=3000
USER node

EXPOSE 3000
CMD ["node","dist/main.js"]

# stable healthcheck (curl exits non-zero on failure)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fsS http://127.0.0.1:3000/health || exit 1
