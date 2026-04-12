# How to Enable Backend Service in docker-compose.yml

## Current Default (Approach A)

The `docker-compose.yml` file comes with the backend service **commented out** by default.

This means:
- PostgreSQL starts automatically: `docker-compose up -d`
- You run backend locally: `npm run dev`

## Enabling Approach B (Backend in Docker)

If you want to test your backend inside Docker (exact production environment), follow these steps:

### Step 1: Open `docker-compose.yml`

View lines ~34-67 where the backend service is commented:

```yaml
  # Node.js Backend API (Optional)
  # Uncomment below to run backend in Docker...
  backend:
    build:
      context: ./backend
```

### Step 2: Uncomment the Backend Service

Remove the `#` from the beginning of each line in the backend service block:

**Before**:
```yaml
  # backend:
  #   build:
  #     context: ./backend
```

**After**:
```yaml
  backend:
    build:
      context: ./backend
```

Or simply delete lines 31-68 initially, then uncomment the entire block at once.

### Step 3: Ensure `npm install` is Done

The backend service builds from your `./backend` directory, but needs `node_modules`:

```bash
cd backend
npm install
```

### Step 4: Start Both Services

```bash
docker-compose up -d
```

This will:
1. Build backend Docker image (first time only)
2. Start PostgreSQL container
3. Start Backend API container
4. Connect them via Docker network

### Step 5: Initialize Database (Optional)

Backend is already running, but you may need to initialize the database:

```bash
# Option A: From your machine (Docker mounts ./backend)
cd backend
npm run setup-db:seed

# Option B: Inside the container
docker-compose exec backend npm run setup-db:seed
```

### Step 6: Verify It's Working

```bash
# Check running services
docker-compose ps

# Test backend
curl http://localhost:3000/health

# View backend logs
docker-compose logs -f backend

# View database logs
docker-compose logs -f postgres
```

## Switching Back to Approach A

If you want to go back to running backend locally:

### Step 1: Stop All Services

```bash
docker-compose down
```

### Step 2: Comment Out Backend Service

Re-comment the backend service in `docker-compose.yml` (lines ~34-67):

```yaml
  # backend:
  #   build:
  #     context: ./backend
  #   ...
```

### Step 3: Start Only PostgreSQL

```bash
docker-compose up -d
```

### Step 4: Run Backend Locally

```bash
cd backend
npm run dev
```

## Volume Mounting for Hot-Reload

In Approach B, both approaches include volume mounting:

```yaml
volumes:
  - ./backend:/app                 # Mount backend source
  - /app/node_modules             # Don't override container's node_modules
```

This means:
- Changes to your code are reflected in the container
- Backend reloads automatically (nodemon watches)
- ~1-2 seconds delay (vs instant with local npm run dev)

## File Structure When Backend is Enabled

```
docker-compose.yml
├── postgres:
│   └── image: postgres:15-alpine
│
└── backend:
    ├── build: ./backend/Dockerfile
    ├── environment: (all dev values)
    ├── ports: 3000:3000
    ├── volumes:
    │   ├── ./backend:/app
    │   └── /app/node_modules
    └── command: npm run dev
```

## Troubleshooting

### "Backend service won't start"

Check logs:
```bash
docker-compose logs backend
```

Common issues:
- `npm install` not run in backend directory
- Port 3000 already in use
- Dockerfile issues (check `backend/Dockerfile`)

### "Database connection fails from backend"

Backend service uses `postgres` as hostname (Docker service name):

```javascript
// Inside backend container
const pool = new Pool({
  host: 'postgres',          // ✓ Correct (service name)
  host: 'localhost',         // ✗ Wrong (no container named localhost)
});
```

Check `backend/src/config/database.js` uses `process.env.DB_HOST`:

```javascript
host: process.env.DB_HOST || 'localhost',
```

When in container, `DB_HOST` should be `postgres` (from environment variables in docker-compose.yml).

### "Hot-reload not working"

Ensure volume mount is correct:

```yaml
volumes:
  - ./backend:/app               # ✓ Mounts current directory
  - /app/node_modules           # ✓ Prevents overriding node_modules
```

### "Port 3000 already in use"

Another backend is running. Stop it:

```bash
# Stop all Docker services
docker-compose down

# Find what's using port 3000
netstat -ano | findstr :3000      # Windows
lsof -i :3000                     # Mac/Linux

# Kill the process or use different port in docker-compose.yml
```

## Comparing the Approaches at Runtime

**Approach A** (Local):
```bash
$ npm run dev
> backend@0.1.0 dev
> nodemon src/index.js

[nodemon] 2.0.20
[nodemon] to restart at any time, type `rs`
[nodemon] watching path(s): /Users/user/Projects/3DPrintCommerce/backend/**
Server running at http://localhost:3000

# Code changes: instant reload ⚡
```

**Approach B** (Docker):
```bash
$ docker-compose logs -f backend
Attaching to 3d-ecommerce-api-dev
api-dev | > backend@0.1.0 dev
api-dev | > nodemon src/index.js
api-dev | [nodemon] 2.0.20
api-dev | Server running at http://localhost:3000

# Code changes: backend detects, restarts in container (~1-2 sec)
```

## Key Takeaway

**Approach A** (default): Perfect for daily development with fast feedback  
**Approach B** (uncommented): Perfect for validating production containerization before deployment
