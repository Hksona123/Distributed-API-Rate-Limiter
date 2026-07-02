# ── Stage 1: Build TypeScript ─────────────────────────────────────────────────
# Uses full node image (with devDependencies) so tsc is available
FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL deps (including typescript, ts-node, etc.)
COPY package.json package-lock.json ./
RUN npm ci

# Compile TypeScript → dist/
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc --skipLibCheck

# Copy Lua scripts alongside compiled JS (loaded at runtime by fs.readFile)
COPY src/lua/ ./dist/lua/

# ── Stage 2: Lean production image ────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Production-only deps — no typescript, no ts-node
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=20s \
  CMD wget -qO- http://localhost:3000/health | grep -q '"status":"healthy"' || exit 1

CMD ["node", "dist/index.js"]
