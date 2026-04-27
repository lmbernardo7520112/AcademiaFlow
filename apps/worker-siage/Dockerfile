# ==============================================================
# AcademiaFlow Worker — Playwright Production Build
# Context: monorepo root (../../)
# Build:   docker build -f apps/worker-siage/Dockerfile -t academiaflow_worker:appliance-v1.4.0 .
# ==============================================================

# Use exact tag as requested (matching Playwright 1.59.1)
FROM mcr.microsoft.com/playwright:v1.59.1-jammy AS builder

# Playwright image has Node.js installed. We enable corepack to use pnpm.
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# 1. Copy manifests first (cache layer)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/siage-bridge/package.json packages/siage-bridge/
COPY apps/worker-siage/package.json apps/worker-siage/

# 2. Install dependencies (requires Chromium for playwright, but the image already has it)
# We set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 to avoid downloading browsers again.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN pnpm install --frozen-lockfile

# 3. Copy source
COPY packages/shared packages/shared
COPY packages/siage-bridge packages/siage-bridge
COPY apps/worker-siage apps/worker-siage

# 4. Build shared, bridge, and worker
RUN pnpm --filter @academiaflow/shared build
RUN pnpm --filter @academiaflow/siage-bridge build
RUN pnpm --filter @academiaflow/worker-siage build

# Stage 2: Production runtime
FROM mcr.microsoft.com/playwright:v1.59.1-jammy AS runtime

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copy manifests for production install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/siage-bridge/package.json packages/siage-bridge/
COPY apps/worker-siage/package.json apps/worker-siage/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/siage-bridge/dist packages/siage-bridge/dist
COPY --from=builder /app/packages/siage-bridge/package.json packages/siage-bridge/
COPY --from=builder /app/apps/worker-siage/dist apps/worker-siage/dist
COPY --from=builder /app/apps/worker-siage/package.json apps/worker-siage/

ENV NODE_ENV=production

# Healthcheck to verify the worker script is accessible and node is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('fs').existsSync('/app/apps/worker-siage/dist/start-worker.js') ? process.exit(0) : process.exit(1)"

# Run the compiled worker
CMD ["node", "apps/worker-siage/dist/start-worker.js"]
