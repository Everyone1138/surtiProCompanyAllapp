# ---------- deps (install all deps with build tools for native bcrypt) ----------
FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=development
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# ---------- builder (compile Nest to dist) ----------
FROM deps AS builder
WORKDIR /app
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build
# prune to production deps after building
RUN npm prune --omit=dev

# ---------- runner (small image to run the app) ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# copy prisma files if your app reads schema at runtime (migrations, etc.)
COPY prisma ./prisma
# copy compiled app and production node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
# helpful for health checks
EXPOSE 3000
CMD ["node", "dist/main.js"]