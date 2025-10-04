# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Adjust if your build command differs
RUN npm run build

# ---------- runtime ----------
FROM nginx:alpine AS runner
# SPA build output location (e.g., Vite)
COPY --from=build /app/dist /usr/share/nginx/html
# Simple SPA + health endpoint
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/health || exit 1