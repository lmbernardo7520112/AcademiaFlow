# ==============================================================
# AcademiaFlow API — Multi-stage Production Build
# Context: monorepo root (../../)
# Build:   docker build -f apps/api/Dockerfile -t academiaflow_api:appliance-v1.2.0 .
# ==============================================================

# Stage 1: Install + Build
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# 1. Copy manifests first (cache layer)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/siage-bridge/package.json packages/siage-bridge/
COPY apps/api/package.json apps/api/

# 2. Install dependencies
RUN pnpm install --frozen-lockfile

# 3. Copy source
COPY packages/shared packages/shared
COPY packages/siage-bridge packages/siage-bridge
COPY apps/api apps/api

# 4. Build shared types and bridge
RUN pnpm --filter @academiaflow/shared build
RUN pnpm --filter @academiaflow/siage-bridge build

# 5. Build API
RUN pnpm --filter @academiaflow/api build

# Stage 2: Production runtime (no dev dependencies)
FROM node:22-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy manifests for production install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/siage-bridge/package.json packages/siage-bridge/
COPY apps/api/package.json apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Install tsx globally for seed script execution (devDep, not in --prod)
RUN npm install -g tsx

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/siage-bridge/dist packages/siage-bridge/dist
COPY --from=builder /app/packages/siage-bridge/package.json packages/siage-bridge/
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/package.json apps/api/

# Copy seed data files (needed for appliance initialization)
COPY apps/api/src/scripts/data apps/api/src/scripts/data

# Copy seed scripts source (tsx will execute them directly)
COPY apps/api/src/scripts apps/api/src/scripts
COPY apps/api/src/models apps/api/src/models
COPY apps/api/src/config apps/api/src/config

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/ping || exit 1

# Run the compiled API server
CMD ["node", "apps/api/dist/server.js"]
