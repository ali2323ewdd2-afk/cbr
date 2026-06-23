# ─── Builder stage (Node.js 22) ────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

# Install build dependencies (openssl for Prisma, python3 for node-gyp/sharp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and .npmrc
COPY package.json .npmrc ./

# ── npm install (NOT npm ci) ────────────────────────────
# We intentionally have NO package-lock.json.
# package.json has:
#   - "prisma": "6.19.2" (exact, no ^)
#   - "@prisma/client": "6.19.2" (exact, no ^)
#   - "overrides": { "prisma": "6.19.2", "@prisma/client": "6.19.2" }
# This TRIPLE lock makes it impossible for Prisma 7 to be installed.
RUN npm install

# ── VERIFY Prisma version — HARD BLOCK ──────────────────
# If this fails, the entire build stops. No silent fallback.
RUN echo "=== Prisma version check ===" && \
    npx prisma --version && \
    PRISMA_V=$(npx prisma --version 2>&1 | head -1 | grep -oP '\d+\.\d+\.\d+' | head -1) && \
    PRISMA_MAJOR=$(echo "$PRISMA_V" | cut -d. -f1) && \
    echo "Installed Prisma: $PRISMA_V (major: $PRISMA_MAJOR)" && \
    if [ "$PRISMA_MAJOR" != "6" ]; then \
      echo "FATAL: Prisma $PRISMA_V detected. Only Prisma 6.x is allowed." && \
      echo "Installed packages:" && npm ls prisma @prisma/client 2>&1 && \
      exit 1; \
    fi && \
    echo "=== Prisma $PRISMA_V confirmed ==="

# Copy source code
COPY . .

# Generate Prisma client from PRODUCTION schema (PostgreSQL)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# Build Next.js (standalone output)
RUN npm run build

# ─── Runner stage ──────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime deps: openssl (Prisma), curl (healthcheck), netcat-openbsd (entrypoint wait)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl curl netcat-openbsd ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Copy ALL node_modules — prisma CLI, bcryptjs, ioredis, tsx, everything.
COPY --from=builder /app/node_modules ./node_modules

# Copy scripts and config
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/mini-services ./mini-services
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.npmrc ./.npmrc

# Make entrypoint executable
RUN chmod +x /app/scripts/entrypoint.sh

RUN mkdir -p /app/data /app/backups
VOLUME ["/app/data", "/app/backups"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["/app/scripts/entrypoint.sh"]