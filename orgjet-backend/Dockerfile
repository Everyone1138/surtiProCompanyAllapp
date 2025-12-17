# ---------- Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# 1) Bring in manifests + build config + prisma first
COPY package*.json ./
COPY tsconfig*.json nest-cli.json ./
COPY prisma ./prisma

# 2) Install deps WITHOUT running postinstall (prevents early 'nest build')
#    We'll run prisma generate + build ourselves later.
RUN npm ci --ignore-scripts

# 3) Now bring in source and build
COPY src ./src
RUN npx prisma generate
RUN npm run build

# ---------- Production ----------
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production

# Minimal runtime deps (no dev) and NO postinstall
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --ignore-scripts \
 && npx prisma generate

# Copy compiled app
COPY --from=builder /app/dist ./dist

EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=20s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node","dist/main.js"]