# Docker Compose Files Quick Reference

## Two Separate Files + Optional Backend in Dev

Instead of commented-out code in one file, we maintain **two purpose-built files** with flexible options:

### Main Approaches

**Development (docker-compose.yml)**:
- Approach A ✅ (Recommended): PostgreSQL only, backend runs locally
- Approach B (Optional): PostgreSQL + Backend in Docker (uncomment backend service)

**Production (docker-compose.prod.yml)**:
- PostgreSQL + Backend always in Docker
- No options, production-ready configuration

## `docker-compose.yml` — Development

**When to use**: Local development (Windows, Mac, or Linux)

**Services**:
- PostgreSQL ✓ (always on)
- Backend ✓ (optional - uncomment to enable)

### Approach A: PostgreSQL Only (Default - Recommended)

**What's enabled**: PostgreSQL only (backend service commented out)

**How to use**:
```bash
docker-compose up -d
cd backend && npm run dev
```

**Your workflow**:
```
┌─────────────────────────────────────────┐
│  Your Windows/Mac/Linux Machine         │
├─────────────────────────────────────────┤
│  Node.js Code (npm run dev)             │  ← Runs on your machine
│  ↓                                      │
│  [Docker Container]                     │
│  PostgreSQL                             │  ← Runs in Container
│                                         │
│  localhost:3000 ← Backend               │
│  localhost:5432 ← Database              │
└─────────────────────────────────────────┘
```

**Advantages**:
- ✅ Fast code reloading (hot-reload with nodemon)
- ✅ Direct IDE debugging with breakpoints
- ✅ Lower memory usage
- ✅ Simple setup (1 container)

**Best For**: Active development, frequent code changes

---

### Approach B: PostgreSQL + Backend in Docker (Optional)

**How to enable**: Uncomment backend service in `docker-compose.yml` (lines ~34-67)

**How to use**:
```bash
docker-compose up -d
```

**Your workflow**:
```
┌────────────────────────────────────┐
│  Your Windows/Mac/Linux Machine    │
├────────────────────────────────────┤
│  [Docker Containers]               │
│  ┌────────┐        ┌──────────┐   │
│  │Backend │  ←→    │PostgreSQL│   │
│  │(Node)  │ (net)  │          │   │
│  └────────┘        └──────────┘   │
│       ↓                           │
│  localhost:3000 ← Backend          │
│  localhost:5432 ← Database         │
└────────────────────────────────────┘
```

**Key Features**:
- ✅ Exact production environment locally
- ✅ Hot-reload via volume mount (`./backend:/app`)
- ✅ Docker network isolates services
- ✅ No local Node.js installation needed
- ✅ Test containerized setup before deployment

**Best For**: Testing production environment, CI/CD validation

---

## Comparison Table

| Feature | Approach A (Dev) | Approach B (Dev) | Production |
|---------|-----------------|-----------------|-----------|
| **Services** | PostgreSQL ✓ | PostgreSQL ✓ | PostgreSQL ✓ |
| **Backend** | Local npm run dev | Docker ✓ | Docker ✓ |
| **Hot Reload** | ✅ Instant (nodemon) | ✅ ~1-2 sec (volume mount) | ❌ Manual rebuild |
| **IDE Debug** | ✅ Breakpoints | ⚠️ Docker logs | ⚠️ Docker logs |
| **Memory Usage** | Lower | Higher | Higher |
| **Setup Time** | ~2 min | ~3 min | N/A (deployment) |
| **Matches Production** | Mostly | Exactly | Exactly |
| **Network** | localhost → container | containers → network | containers → network |
| **Best For** | Daily development | Testing prod locally | Server deployment |
| **DB Host in Code** | `localhost` | `postgres` | `postgres` |

---

## Quick Decision Guide

**Choose Approach A if**:
- ✅ You're doing active development
- ✅ You need fast hot-reload and IDE debugging
- ✅ You want minimal memory usage
- ✅ You're confident the code works locally

**Choose Approach B if**:
- ✅ You want exact production environment locally
- ✅ You're testing containerized setup
- ✅ You're preparing for deployment
- ✅ You want zero Node.js installation complexity

**Use Production if**:
- ✅ You're actually deploying to a server
- ✅ Running on Linux server
- ✅ Ready for production traffic

---

## Environment Variables

### Development (`.env.docker`)
```env
DB_HOST=postgres              # Docker service name
DB_PORT=5432
DB_NAME=ecommerce_3d_db
DB_USER=postgres
DB_PASSWORD=postgres          # It's OK, local only
```

Connection string for local code:
```javascript
const pool = new Pool({
  host: 'localhost',          // Your Windows machine
  port: 5432,
  database: 'ecommerce_3d_db',
});
```

### Production (`.env.prod`)
```env
DB_HOST=postgres              # Docker service name (inside network)
DB_PORT=5432
DB_NAME=ecommerce_3d_db_prod
DB_USER=postgres_prod
DB_PASSWORD=STRONG_PASSWORD   # Must be real password
NODE_ENV=production
JWT_SECRET=LONG_RANDOM_STRING
# ... all other production variables
```

Connection string for backend service:
```javascript
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',  // 'postgres' from env
  port: 5432,
  database: 'ecommerce_3d_db_prod',
});
```

---

## Development Workflow

### Start Development
```bash
# From project root
docker-compose up -d

# Terminal 1: View PostgreSQL logs
docker-compose logs -f postgres

# Terminal 2: Start backend
cd backend
npm install
npm run setup-db:seed
npm run dev

# Access
curl http://localhost:3000/health          # Backend
psql -h localhost -U postgres -d ecommerce_3d_db  # Database
```

### Make Code Changes
```bash
# Edit files in your IDE
# Backend reloads automatically (nodemon watches changes)
# No need to restart anything!
```

### Stop Development
```bash
docker-compose down          # Keep data
docker-compose down -v       # Remove data (fresh start)
```

---

## Production Deployment Workflow

### Build & Deploy
```bash
# On your local machine (optional pre-build)
docker build -t my-ecommerce-api backend/

# On production server
docker-compose -f docker-compose.prod.yml build     # Build image
docker-compose -f docker-compose.prod.yml up -d     # Start services
```

### Monitor Production
```bash
# View status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check backend health
curl http://server-ip:3000/health

# Check database
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d ecommerce_3d_db_prod -c "SELECT count(*) FROM users;"
```

### Update Code
```bash
# Pull new code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Migrations (if needed)
docker-compose -f docker-compose.prod.yml exec backend npm run setup-db
```

---

## Network Isolation

### Development
**Container**: Can reach `localhost` (your Windows machine)
**Your Machine**: Can reach `localhost:5432` (PostgreSQL)
```
Your Code → localhost:5432 → PostgreSQL Container
```

### Production
**Backend Container**: Uses service name `postgres`
**PostgreSQL Container**: Accessible as `postgres` in Docker network
```
Backend Container → postgres:5432 → PostgreSQL Container
(via Docker bridge network)
```

---

## Remember

| Situation | Command |
|-----------|---------|
| **I'm developing locally** | `docker-compose up -d` |
| **I'm deploying to server** | `docker-compose -f docker-compose.prod.yml up -d` |
| **I want both configs** | Commit both files to git |
| **I need to change DB credentials** | Edit `.env` or `.env.prod` |
| **I don't want .env in git** | (It's in `.gitignore` already) |

---

## Troubleshooting

### "Can't connect to database"
- Development: Check `docker-compose ps` (PostgreSQL running?)
- Production: Check `docker-compose -f docker-compose.prod.yml ps`

### "Backend service not starting"
- Only for production (`docker-compose.prod.yml`)
- Development doesn't have backend service (you run it locally!)

### "Port 3000 already in use"
- Development: Nothing listens on 3000 from Docker (you run npm locally)
- Production: Another backend service is running. Stop it first: `docker-compose -f docker-compose.prod.yml down`
