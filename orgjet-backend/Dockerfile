# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source and Prisma schema
COPY . .
# Generate Prisma client (needs schema.prisma in ./prisma/)
RUN npx prisma generate

# Build Nest -> dist/
RUN npm run build

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy only what’s needed to run
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled app and Prisma artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma

# If you run migrations at start (optional):
# ENV DATABASE_URL=...
# CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

EXPOSE 3000
CMD ["node", "dist/main.js"]