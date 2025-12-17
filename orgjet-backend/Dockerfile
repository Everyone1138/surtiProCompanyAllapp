# -------- Build stage --------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first for cache hits
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
# If you use Prisma or other codegen, add those here before build
# RUN npx prisma generate
RUN npm run build

# -------- Runtime stage --------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Bring the compiled app
COPY --from=build /app/dist ./dist

# If you serve static uploads inside the container, ensure the dir exists:
# RUN mkdir -p /app/uploads

EXPOSE 3000
# Start the compiled app
CMD ["node", "dist/main.js"]