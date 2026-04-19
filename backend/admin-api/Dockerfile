# =============================================================
# Admin API — Dockerfile
# Serves admin-only routes on ADMIN_PORT (default 3001).
# This image should NEVER be deployed behind a public load balancer.
# Build context must be the backend/ directory:
#   docker build -f admin-api/Dockerfile -t 3d-admin-api .
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

# Admin API port — do NOT publish this port to 0.0.0.0 in production
EXPOSE 3001

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })"

CMD ["node", "src/adminServer.js"]
