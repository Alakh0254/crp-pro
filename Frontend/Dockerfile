# ---- Stage 1: build the static bundle ----
FROM node:20-slim AS build

WORKDIR /app

# Install dependencies first as their own layer so edits to source don't bust the
# npm cache. npm ci installs exactly what's locked in package-lock.json.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source. node_modules, dist, and .env are excluded via
# .dockerignore and never enter the image.
COPY . .

# Vite inlines env vars at build time, so VITE_API_URL must be present now, not at
# runtime. Override per environment with --build-arg VITE_API_URL=https://api.example.com.
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

# Produces the static site under /app/dist.
RUN npm run build

# ---- Stage 2: serve the static bundle ----
# nginx-unprivileged runs as the non-root uid 101 user and listens on 8080 by
# default, so no USER or CMD overrides are needed.
FROM nginxinc/nginx-unprivileged:alpine

# Copy only the built assets — no Node, no source, no secrets carry over.
COPY --from=build /app/dist /usr/share/nginx/html

# SPA history fallback + caching rules.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
