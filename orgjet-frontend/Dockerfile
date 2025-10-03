# build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# serve static build with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# simple default config
RUN printf 'server { listen 80; root /usr/share/nginx/html; index index.html; try_files $uri /index.html; }' > /etc/nginx/conf.d/default.conf