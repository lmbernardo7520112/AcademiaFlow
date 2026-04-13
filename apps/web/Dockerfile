# ==============================================================
# AcademiaFlow Web — Multi-stage Production Build
# Context: monorepo root (../../)
# Build:   docker build -f apps/web/Dockerfile -t academiaflow_web:v1.0.2 .
# ==============================================================

# Stage 1: Install + Build
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# 1. Copy manifests first (cache layer)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

# 2. Install dependencies
RUN pnpm install --frozen-lockfile

# 3. Copy source
COPY packages/shared packages/shared
COPY apps/web apps/web

# 4. Build shared types (dependency of web)
RUN pnpm --filter @academiaflow/shared build

# 5. Inject production env via build args
ARG VITE_API_URL=/api
ARG VITE_APP_MODE=school_production
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_MODE=$VITE_APP_MODE

# 6. Build web
RUN pnpm --filter @academiaflow/web build

# Stage 2: Serve static assets via nginx
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
