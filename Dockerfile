# 43V3R BET AI Platform - Multi-Stage Production Dockerfile
# Optimized for production with health checks and security hardening

# ==================== BASE STAGE ====================
FROM oven/bun:1 AS base

# Install dependencies only needed for building
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ==================== DEPS STAGE ====================
FROM base AS deps

# Copy package files for dependency installation
COPY package.json bun.lock* package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile --production=false

# Generate Prisma Client
RUN bunx prisma generate

# ==================== BUILDER STAGE ====================
FROM deps AS builder

# Copy source code
COPY . .

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN bun run build

# ==================== FRONTEND STAGE (Next.js) ====================
FROM base AS frontend

# Create non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Copy node_modules for runtime
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Start the application
CMD ["bun", "server.js"]

# ==================== AI ENGINE STAGE ====================
FROM base AS ai-engine

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

WORKDIR /app

# Copy AI engine service
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs mini-services/ai-engine ./mini-services/ai-engine
COPY --chown=nodejs:nodejs prisma ./prisma

# Generate Prisma Client for AI engine
RUN bunx prisma generate

ENV NODE_ENV=production
ENV PORT=3006

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3006/health || exit 1

USER nodejs
EXPOSE 3006

WORKDIR /app/mini-services/ai-engine
CMD ["bun", "index.ts"]

# ==================== SCRAPER SERVICE STAGE ====================
FROM base AS scraper-service

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

WORKDIR /app

# Copy scraper service
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs mini-services/scraper-service ./mini-services/scraper-service
COPY --chown=nodejs:nodejs prisma ./prisma

RUN bunx prisma generate

ENV NODE_ENV=production
ENV PORT=3005

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3005/health || exit 1

USER nodejs
EXPOSE 3005

WORKDIR /app/mini-services/scraper-service
CMD ["bun", "index.ts"]

# ==================== TELEGRAM BOT STAGE ====================
FROM base AS telegram-bot

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

WORKDIR /app

# Copy telegram bot service
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs mini-services/telegram-bot ./mini-services/telegram-bot
COPY --chown=nodejs:nodejs prisma ./prisma

RUN bunx prisma generate

ENV NODE_ENV=production
ENV PORT=3008

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3008/health || exit 1

USER nodejs
EXPOSE 3008

WORKDIR /app/mini-services/telegram-bot
CMD ["bun", "index.ts"]

# ==================== REALTIME SERVICE STAGE ====================
FROM base AS realtime-service

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

WORKDIR /app

# Copy realtime service
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs mini-services/realtime-service ./mini-services/realtime-service

ENV NODE_ENV=production
ENV PORT=3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

USER nodejs
EXPOSE 3003

WORKDIR /app/mini-services/realtime-service
CMD ["bun", "index.ts"]

# ==================== DEVELOPMENT STAGE ====================
FROM base AS development

WORKDIR /app

# Copy all source files
COPY . .

# Install all dependencies (including devDependencies)
RUN bun install

# Generate Prisma Client
RUN bunx prisma generate

ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "dev"]
