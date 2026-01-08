# ---------- Stage 1: deps+build (dev deps present) ----------
FROM node:20-alpine AS build
WORKDIR /app

# native toolchain for bcrypt & Prisma engines
RUN apk add --no-cache python3 make g++ libc6-compat openssl

# don't run your postinstall here; we'll call prisma/build explicitly
ENV SKIP_POSTINSTALL=1

# deps for build
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# copy sources for the actual build
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# generate prisma client for the build & then compile Nest to dist/
RUN npx prisma generate
RUN npm run build


# ---------- Stage 2: prod dependencies only ----------
FROM node:20-alpine AS prod-deps
WORKDIR /app

# we DO need native toolchain here so bcrypt can build during npm ci
RUN apk add --no-cache python3 make g++ libc6-compat openssl

# skip your postinstall here (we only want prod deps, not another build)
ENV SKIP_POSTINSTALL=1

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate


# ---------- Stage 3: runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

RUN apk add --no-cache wget openssl libc6-compat

# bring in prod node_modules and prisma
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/prisma ./prisma

# package.json (mainly for metadata)
COPY package*.json ./

# compiled app
COPY --from=build /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=2 \
  CMD wget -qO- http://localhost:3000/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "dist/main.js"]