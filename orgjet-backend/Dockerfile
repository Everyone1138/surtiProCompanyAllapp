# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
# Useful for Prisma and healthchecks
RUN apk add --no-cache openssl curl

# ---------- deps (install deps without running postinstall) ----------
FROM base AS install_deps
# Copy only what's needed to install deps + let prisma be visible if scripts ever run
COPY package*.json ./
COPY prisma ./prisma
# Avoid running "postinstall" (which tries prisma generate) at this point
RUN npm ci --ignore-scripts

# ---------- build (compile TS and generate Prisma client) ----------
FROM base AS build_app
# Bring in node_modules from deps
COPY --from=install_deps /app/node_modules ./node_modules

# Copy the rest of your source
# Adjust these lines to match your repo (Nest/TS assumed)
COPY tsconfig*.json ./
COPY src ./src
COPY prisma ./prisma

# Now generate Prisma client and build your app
RUN npx prisma generate
# If you have a build script (e.g. tsc / nest build)
RUN npm run build

# Prune dev deps to shrink runtime
RUN npm prune --omit=dev

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# curl is only needed for the healthcheck
RUN apk add --no-cache curl

# Use the pre-existing 'node' user from the base image
# (no adduser/addgroup needed)
COPY --from=build_app /app/node_modules ./node_modules
COPY --from=build_app /app/dist ./dist
# Keep prisma only if your app needs it at runtime (migrations, etc.)
COPY prisma ./prisma

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1
CMD ["node","dist/main.js"]