# --- Stage 1: Build ---
FROM node:20.12.2-slim AS builder

# Set environment
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Copy lockfile and manifest
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Install dependencies
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source and build
COPY frontend .
RUN pnpm run build

# --- Stage 2: Runtime ---
FROM node:20.12.2-slim

WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs && mkdir -p /app/frontend/.next && chown -R nodejs:nodejs /app/frontend

# Copy built artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

USER nodejs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["pnpm", "start"]
