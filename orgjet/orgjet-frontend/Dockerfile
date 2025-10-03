# build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# allow build-time override for API base
ARG VITE_API_BASE=""
ENV VITE_API_BASE=$VITE_API_BASE

# Vite will pick up ENV vars starting with VITE_
RUN npm run build

# serve static build with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'server { listen 80; root /usr/share/nginx/html; index index.html; try_files $uri /index.html; }' > /etc/nginx/conf.d/default.conf