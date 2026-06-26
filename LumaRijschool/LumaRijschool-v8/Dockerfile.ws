# ─── WebSocket Mini-Service (Node.js 22) ───────────────
FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and .npmrc (overrides are in package.json)
COPY package.json .npmrc ./

# npm install — same triple-lock as main Dockerfile
RUN npm install

# Verify Prisma version
RUN PRISMA_V=$(npx prisma --version 2>&1 | head -1 | grep -oP '\d+\.\d+\.\d+' | head -1) && \
    PRISMA_MAJOR=$(echo "$PRISMA_V" | cut -d. -f1) && \
    echo "WS: Prisma $PRISMA_V" && \
    if [ "$PRISMA_MAJOR" != "6" ]; then echo "FATAL: Prisma $PRISMA_V in WS build" && exit 1; fi

COPY . .

# Generate Prisma client
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# ─── Runner ────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/mini-services ./mini-services
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.npmrc ./.npmrc

ENV NODE_ENV=production
ENV WS_PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -sf http://localhost:3001/health || exit 1

CMD ["npx", "tsx", "mini-services/ws/index.ts"]