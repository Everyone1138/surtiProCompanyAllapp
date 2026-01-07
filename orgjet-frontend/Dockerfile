# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Allow CI (or local builds) to pass your API base at build time
# e.g. docker build --build-arg VITE_API_BASE=https://api.example.com .
ARG VITE_API_BASE/api
ENV VITE_API_BASE=${VITE_API_BASE}

# Adjust if your build command differs
RUN npm run build

# ---------- runtime ----------
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# (Optional but recommended) curl for healthcheck
RUN apk add --no-cache curl

# SPA build output location (e.g., Vite)
COPY --from=build /app/dist /usr/share/nginx/html

# Simple SPA + health endpoint
# Make sure you have an nginx.conf next to this Dockerfile (see sample below)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Use curl (installed above) for stable healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fsS http://127.0.0.1/health || exit 1

