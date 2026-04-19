# =============================================================
# Public API — Dockerfile
# Serves end-user routes on PORT (default 3000).
# Build context must be the backend/ directory:
#   docker build -f public-api/Dockerfile -t 3d-public-api .
# =============================================================

FROM node:18-alpine AS builder

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# =============================================================
FROM node:18-alpine

WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy all backend source (shared models, config, routes, etc.)
COPY . .

# Public API port
EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })"

CMD ["node", "src/index.js"]
