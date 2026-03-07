FROM node:20.12.2-slim AS builder

WORKDIR /workspace/src/frontend
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY src/frontend/package.json src/frontend/pnpm-lock.yaml ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY src/frontend ./
COPY openapi ../../openapi

RUN pnpm run build

FROM node:20.12.2-slim

WORKDIR /app
ENV NODE_ENV=production

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

COPY --from=builder --chown=nodejs:nodejs /workspace/src/frontend/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /workspace/src/frontend/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /workspace/src/frontend/public ./public

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

USER nodejs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
