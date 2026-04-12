# Docker Setup Guide

## Overview

This project uses Docker for consistent development and production environments. Two separate Docker Compose files ensure clean separation:

- **`docker-compose.yml`** — Development (PostgreSQL only)
- **`docker-compose.prod.yml`** — Production (PostgreSQL + Backend)

## Prerequisites

- **Docker Desktop** installed ([download here](https://www.docker.com/products/docker-desktop))
- **Docker Compose** (included with Docker Desktop)
- Node.js installed locally (for running backend code in development)

## Docker Compose Files

### Development (`docker-compose.yml`)
Used for local development on Windows/Mac/Linux with **two approaches**:

**Approach A: PostgreSQL Only (Recommended for active development)**
- Backend runs locally on your machine
- Hot-reload with `npm run dev`
- Direct IDE integration and debugging
- Backend service is commented out (default)

```bash
docker-compose up -d          # Start PostgreSQL only
npm run dev                   # Run backend locally
```

**Approach B: PostgreSQL + Backend in Docker (Testing exact production environment)**
- Both services run in containers
- Test exact production setup locally
- No local Node.js installation needed
- Backend service in docker-compose.yml can be uncommented

```bash
# Uncomment backend service in docker-compose.yml
# Then:
docker-compose up -d          # Start PostgreSQL + Backend in containers
# Backend auto-reloads via volume mount
```

Both approaches support hot-reload via volume mounting of `./backend:/app`

### Production (`docker-compose.prod.yml`)
Used for deploying to Linux servers:
- PostgreSQL + Backend API both containerized
- Backend runs as Docker service
- Environment-based configuration (no code changes)
- Resource limits and health checks
- Optional Nginx reverse proxy for SSL/load balancing

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Quick Start (3 Steps) - Development

### 1. Start PostgreSQL Container

```bash
# From project root
docker-compose up -d
```

This:
- Downloads PostgreSQL 15 Alpine image (first time only)
- Starts PostgreSQL container
- Exposes it on `localhost:5432`
- Creates volume for persistent data

### 2. Configure Environment Variables

```bash
# Copy Docker environment template
copy .env.docker backend\.env

# Edit backend\.env to match your setup (usually no changes needed)
```

### 3. Initialize Database

```bash
cd backend
npm install
npm run setup-db:seed
```

This:
- Creates the database
- Runs all migrations
- Seeds sample data
- Ready to develop!

## Checking Status

### View running containers
```bash
docker-compose ps
```

### View PostgreSQL logs
```bash
docker-compose logs postgres
```

### Connect directly to database
```bash
# Via psql (if installed)
psql -h localhost -U postgres -d ecommerce_3d_db

# Or via Docker
docker-compose exec postgres psql -U postgres -d ecommerce_3d_db
```

## Quick Start (3 Steps) - Development

### Approach A: PostgreSQL Only (Recommended)

#### 1. Start PostgreSQL Container

```bash
# From project root
docker-compose up -d
```

This:
- Downloads PostgreSQL 15 Alpine image (first time only)
- Starts PostgreSQL container
- Exposes it on `localhost:5432`
- Creates volume for persistent data

#### 2. Configure Environment Variables

```bash
# Copy Docker environment template
copy .env.docker backend\.env

# Edit backend\.env to match your setup (usually no changes needed)
```

#### 3. Initialize Database & Start Backend

```bash
cd backend
npm install
npm run setup-db:seed
npm run dev
```

This:
- Creates the database
- Runs all migrations
- Seeds sample data
- Starts backend with hot-reload

**Access**:
- Backend: `http://localhost:3000`
- Database: `localhost:5432`
- Logs: `docker-compose logs -f postgres`

---

### Approach B: PostgreSQL + Backend in Docker (Testing Production Environment)

#### 1. Enable Backend Service

Edit `docker-compose.yml` and uncomment the `backend` service (lines ~34-67):

```yaml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: 3d-ecommerce-api-dev
    environment:
      ...
```

#### 2. Start Both Services

```bash
# From project root
docker-compose up -d
```

This:
- Starts PostgreSQL container
- Builds backend Docker image
- Starts backend container
- Both services connect via Docker network

#### 3. Initialize Database

```bash
# Backend is running in container, initialize from your machine
cd backend
npm install
npm run setup-db:seed
```

Or via Docker:
```bash
docker-compose exec backend npm run setup-db:seed
```

**Access**:
- Backend: `http://localhost:3000`
- Database: `localhost:5432`
- Logs: `docker-compose logs -f`

**Benefits**:
- ✅ Exact production environment on your machine
- ✅ Hot-reload via volume mount: `/backend:/app`
- ✅ Test containerized setup before deployment
- ✅ No local Node.js installation needed

---

## Comparison: Approach A vs B

| Aspect | Approach A | Approach B |
|--------|-----------|-----------|
| **PostgreSQL** | Docker ✓ | Docker ✓ |
| **Backend** | Local (npm run dev) | Docker ✓ |
| **Setup Time** | ~2 min | ~3 min (first build) |
| **Hot Reload** | Instant (nodemon) | ~1-2 sec (volume mount) |
| **Debugging** | IDE breakpoints ✓ | Docker logs |
| **Matches Prod** | Mostly | Exactly |
| **Memory Usage** | Lower | Higher |
| **Best For** | Active development | Testing prod setup |

---

## Development Workflow (Approach A Recommended)
```bash
docker-compose up -d
cd backend
npm run dev
```

### Stop everything
```bash
docker-compose down
```

### Restart PostgreSQL
```bash
docker-compose restart postgres
```

### Reset database (clear all data)
```bash
# Stop containers and remove volume
docker-compose down -v

# Restart with fresh database
docker-compose up -d
npm run setup-db:seed
```

### View database size
```bash
docker-compose exec postgres psql -U postgres -d ecommerce_3d_db -c "SELECT pg_size_pretty(pg_database_size('ecommerce_3d_db'));"
```

## File Structure

```
project-root/
├── docker-compose.yml              ← Development: PostgreSQL only
├── docker-compose.prod.yml         ← Production: PostgreSQL + Backend
├── .env.docker                     ← Development defaults
├── .env.prod                       ← Production template
└── backend/
    ├── Dockerfile                  ← Backend image definition
    ├── .dockerignore               ← What NOT to include in container
    └── src/config/database.js      ← Connection config
```

## Understanding the Setup

### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:15-alpine      ← PostgreSQL version
    environment:                    ← Database credentials
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ecommerce_3d_db
    ports:
      - "5432:5432"              ← Host:Container port mapping
    volumes:
      - postgres_data:/var/lib/postgresql/data  ← Persistent storage
```

### Connection Inside Container vs Outside

**From your local code** (Node.js on Windows):
```
localhost:5432
```

**From inside Docker network** (if backend runs in container):
```
postgres:5432  ← Service name in docker-compose
```

Our default setup connects local code to containerized PostgreSQL, so use `localhost:5432`.

## Environment Variables

### Default (.env.docker)
```env
DB_USER=postgres          # Default user
DB_PASSWORD=postgres      # Default password (change in production!)
DB_NAME=ecommerce_3d_db
DB_PORT=5432
```

### Custom Configuration

Create `backend/.env`:
```bash
cp .env.docker backend/.env
```

Edit variables as needed. Docker will use these when containers start.

## Common Issues & Solutions

### Port 5432 Already in Use

**Problem**: `Error: listen EADDRINUSE :::5432`

**Solution**: Another PostgreSQL is running locally
```bash
# Option 1: Stop local PostgreSQL
net stop PostgreSQL14          # Windows
brew services stop postgresql  # Mac

# Option 2: Use different port in docker-compose.yml
# Change: "5432:5432" to "5433:5432"
# Then connect to localhost:5433
```

### Cannot Connect to Database

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**: Container not running
```bash
# Check status
docker-compose ps

# Start PostgreSQL
docker-compose up -d postgres

# Wait 10 seconds for startup
timeout 10
```

### Database Already Exists

**Problem**: Migration fails with "database already exists"

**Solution**: Remove old data and restart
```bash
docker-compose down -v          # Remove volume
docker-compose up -d postgres   # Fresh start
npm run setup-db:seed
```

### Permission Denied (Windows PowerShell)

**Problem**: `Permission denied` when running docker commands

**Solution**: Run PowerShell as Administrator or use CMD

### Memory Issues

**Problem**: Docker container using too much memory

**Solution**: Edit `docker-compose.prod.yml` and adjust resource limits:
```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 2G
```

## Production Deployment

### Deploying to Linux Server

1. **Copy files to production server**:
   ```bash
   scp docker-compose.prod.yml user@server:/app/
   scp backend/Dockerfile user@server:/app/backend/
   scp -r backend/src user@server:/app/backend/
   scp backend/package*.json user@server:/app/backend/
   ```

2. **Create `.env.prod` on server**:
   ```bash
   cp .env.prod on server
   # Edit with real values:
   # - Database credentials
   # - JWT secret
   # - Razorpay live keys
   # - SendGrid API key
   # - AWS S3 credentials
   ```

3. **Deploy**:
   ```bash
   cd /app
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Verify**:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   docker-compose -f docker-compose.prod.yml logs backend
   ```

### Database Migrations on Production

```bash
# Run migrations on existing production database
docker-compose -f docker-compose.prod.yml exec backend npm run setup-db

# OR with seed data (careful!)
docker-compose -f docker-compose.prod.yml exec backend npm run setup-db:seed
```

### Backing up Production Database

```bash
# Backup database to file
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U $DB_USER $DB_NAME > backup-$(date +%Y%m%d).sql

# Restore from backup
cat backup-20260412.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $DB_USER -d $DB_NAME
```

### Environment Variables for Production

Use `docker-compose -f docker-compose.prod.yml` and set environment from `.env.prod`:

```bash
# Development uses docker-compose.yml (no backend service)
docker-compose up -d

# Production uses docker-compose.prod.yml (both services)
docker-compose -f docker-compose.prod.yml up -d
```

See `.env.prod` for all production variables. **Never commit `.env.prod` to git!**

## Useful Docker Commands

```bash
# View all containers/images
docker ps -a
docker images

# Remove unused images/containers
docker image prune
docker container prune

# View logs
docker logs container-name
docker-compose logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f backend

# Execute command in running container
docker exec container-id command
docker-compose exec postgres psql ...

# Stop all containers
docker stop $(docker ps -q)

# Remove container (keeps image)
docker rm container-id

# Remove image
docker rmi image-id
```

## Switching Between Development and Production

### Development (Local Windows/Mac/Linux)
```bash
# Start PostgreSQL only
docker-compose up -d

# Run backend on your machine
cd backend
npm run dev

# Access
curl http://localhost:3000/health
```

### Production (Linux Server)
```bash
# Start PostgreSQL + Backend in containers
docker-compose -f docker-compose.prod.yml up -d

# Access
curl http://server-ip:3000/health

# Monitor
docker-compose -f docker-compose.prod.yml logs -f
```

## Next Steps

1. ✅ Install Docker Desktop
2. ✅ Run `docker-compose up -d`
3. ✅ Run `npm run setup-db:seed`
4. ✅ Start developing: `npm run dev`

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
