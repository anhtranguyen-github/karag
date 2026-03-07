# --- Stage 1: Build ---
FROM node:20.12.2-slim AS builder

WORKDIR /workspace/src/frontend
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Copy lockfile and manifest
COPY src/frontend/package.json src/frontend/pnpm-lock.yaml ./

# Install dependencies
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source and build
COPY src/frontend ./
COPY openapi ../../openapi
RUN pnpm run build

# --- Stage 2: Runtime ---
FROM node:20.12.2-slim

WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Copy built artifacts (Standalone mode)
# Standalone mode only includes the necessary files from node_modules
COPY --from=builder --chown=nodejs:nodejs /workspace/src/frontend/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /workspace/src/frontend/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /workspace/src/frontend/public ./public

# Install curl for healthcheck and clean up
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

USER nodejs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || curl -f http://localhost:3000/ || exit 1

# Standalone output uses server.js
CMD ["node", "server.js"]

