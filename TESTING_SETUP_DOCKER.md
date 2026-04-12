# 🐳 Testing Setup Checklist (Docker Version) - 3D Print Commerce

Complete this checklist to test using Docker. **Two options available** - pick one below.

---

## ✅ **PREREQUISITES** - Install Docker

### 1. **Docker Desktop**
- [ ] Download & install Docker Desktop from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- [ ] For Windows: Enable WSL 2 backend (Docker Desktop settings)
- [ ] Verify installation:
  ```bash
  docker --version       # Should be 24.0 or higher
  docker compose version # Should be 2.x or higher
  ```

### 2. **Node.js (For Option 1 only)**
- [ ] Download & install Node.js 18+ from [nodejs.org](https://nodejs.org)
- [ ] **Skip if using Option 3** (Everything in Docker)

### 3. **Dockerfile for Frontend** (For Option 3 only)
- [ ] Create `web/Dockerfile` (see template at bottom of this file)

---

## 🚀 **OPTION 1: RECOMMENDED FOR DEVELOPMENT** ⭐

**Database in Docker + Backend/Frontend Local**

```
PostgreSQL:  Docker container (port 5432)
Backend:     Your Windows machine (port 3000)
Frontend:    Your Windows machine (port 3000 + React dev server)
```

### **Terminal 1: Start PostgreSQL in Docker**
```bash
cd e:\Projects\3DPrintCommerce
docker compose up -d
# Only PostgreSQL container starts (backend is commented out)
```

**First time only - Initialize database:**
```bash
docker compose exec postgres psql -U postgres -c "CREATE DATABASE ecommerce_3d_db;"
# OR manually run migrations via backend
```

### **Terminal 2: Start Backend Locally**
```bash
cd e:\Projects\3DPrintCommerce\backend

# First time only
npm install
npm run migrate
npm run seed

# Start server
npm start
# Backend runs on http://localhost:3000
```

### **Terminal 3: Start Frontend Locally**
```bash
cd e:\Projects\3DPrintCommerce\web

# First time only
npm install

# Create .env
copy .env.example .env

# Start dev server
npm start
# Frontend opens at http://localhost:3000 in browser
```

✅ **All running!**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3000/api`
- Database: Docker container at `localhost:5432`

### **Advantages:**
- ✅ Fastest hot-reload for both backend and frontend
- ✅ Easy debugging with direct access to Node processes
- ✅ Standard local development workflow
- ✅ Database stays persistent in Docker

### **Disadvantages:**
- Need Node.js installed locally
- Different from production (production has everything in Docker)

---

## 🐳 **OPTION 3: EVERYTHING IN DOCKER** (Alternative)

**All services containerized - matches production environment**

```
PostgreSQL:  Docker container (port 5432)
Backend:     Docker container (port 3000)
Frontend:    Docker container (port 3001)
```

### **Step 1: Create Frontend Dockerfile**

Create file: `web/Dockerfile`

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
```

### **Step 2: Create .env File**

```bash
cd e:\Projects\3DPrintCommerce
copy .env.docker .env
```

### **Step 3: Start All Services**

```bash
docker compose -f docker-compose.full.yml up -d
```

**First time only - Initialize database:**
```bash
docker compose -f docker-compose.full.yml exec backend npm run migrate
docker compose -f docker-compose.full.yml exec backend npm run seed
```

### **Step 4: Access Services**

- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:3000/api` (from host)
- Database: `localhost:5432`

✅ **All running in Docker!**

### **Advantages:**
- ✅ Exact production environment locally
- ✅ No Node.js needed on your machine
- ✅ Easier deployments (everything containerized)
- ✅ Isolated environments

### **Disadvantages:**
- Slower hot-reload (Docker rebuild needed)
- More memory usage
- More complex debugging

### **Useful Commands:**

```bash
# View all logs
docker compose -f docker-compose.full.yml logs -f

# View specific service logs
docker compose -f docker-compose.full.yml logs -f backend
docker compose -f docker-compose.full.yml logs -f frontend

# Stop all
docker compose -f docker-compose.full.yml down

# Reset database (delete all data)
docker compose -f docker-compose.full.yml down -v
docker compose -f docker-compose.full.yml up -d
docker compose -f docker-compose.full.yml exec backend npm run migrate
docker compose -f docker-compose.full.yml exec backend npm run seed
```

---

## 📋 **TESTING CHECKLIST** (Same for both options)

### **1. Public Pages**
- [ ] Home page loads (`/`)
- [ ] Products listing (`/products`)
- [ ] Product detail (`/products/:id`)

### **2. Authentication**
- [ ] Register new user
- [ ] Login with `test@example.com` / `password123` (from seed data)
- [ ] View & edit profile
- [ ] Logout

### **3. Shopping Cart**
- [ ] Add product to cart
- [ ] View cart with items
- [ ] Adjust quantity
- [ ] Proceed to checkout

### **4. Checkout & Orders**
- [ ] Fill shipping form
- [ ] Create order
- [ ] View order history
- [ ] View order details

### **5. Admin Features**
- [ ] Login as admin (promote a user in database if needed)
- [ ] Admin Dashboard (`/admin`) - see metrics
- [ ] Inventory Management (`/admin/inventory`) - view/adjust stock
- [ ] Fulfillment Queue (`/admin/fulfillment`) - update order status

---

## 🔧 **Docker Management Commands**

### **For Option 1 (Database only):**
```bash
# View logs
docker compose logs postgres -f

# Stop
docker compose down

# Restart
docker compose restart

# Reset database
docker compose down -v
docker compose up -d
```

### **For Option 3 (Full stack):**
```bash
# View all logs
docker compose -f docker-compose.full.yml logs -f

# View specific service
docker compose -f docker-compose.full.yml logs backend -f

# Stop all
docker compose -f docker-compose.full.yml down

# Rebuild containers (if Dockerfile changed)
docker compose -f docker-compose.full.yml build --no-cache
docker compose -f docker-compose.full.yml up -d
```

---

## 🐛 **Troubleshooting**

### **"docker compose not found"**
```bash
# You might have docker-compose (old) instead of docker compose (new)
docker-compose --version

# If using old version:
docker-compose up -d
```

### **Port Already in Use**
```bash
# Find process on port 3000
netstat -ano | findstr :3000

# Kill it
taskkill /PID <PID> /F

# OR change port in docker-compose.yml:
# ports:
#   - "3001:3000"
```

### **Docker Container Won't Start**
```bash
# Check logs
docker compose logs backend
docker compose logs postgres

# Ensure .env file exists
dir .env
```

### **"postgres: command not found" in Docker**
```bash
# Wait 30-60 seconds for container startup on first run
# OR check if postgres container is running
docker compose ps
```

### **Database Connection Failed**
```bash
# Rebuild and reset
docker compose down -v
docker compose up -d
# Wait 30 seconds for postgres to start
docker compose exec backend npm run migrate
```

---

## ✨ **Quick Reference**

### **Option 1 (Recommended):**
```bash
# Terminal 1: Database
cd e:\Projects\3DPrintCommerce
docker compose up -d

# Terminal 2: Backend
cd backend
npm install
npm run migrate
npm run seed
npm start

# Terminal 3: Frontend
cd web
npm install
npm start  # Opens browser at localhost:3000
```

### **Option 3:**
```bash
# Create frontend Dockerfile (see above)
# Create .env file
copy .env.docker .env

# All in one command
docker compose -f docker-compose.full.yml up -d

# Access at http://localhost:3001 (frontend)
```

---

## 📊 **Comparison**

| Feature | Option 1 | Option 3 |
|---------|----------|----------|
| **Learning** | Easy - standard local dev | Advanced - Docker pattern |
| **Performance** | Fastest hot-reload | Slower rebuilds |
| **Matches Prod** | No | Yes |
| **Setup Time** | 5 minutes | 10 minutes |
| **Best For** | Development | Testing prod env / CI-CD prep |
| **Production Ready** | No | Yes |

---

**Pick Option 1 for fastest development! Pick Option 3 to test production setup.** 🚀


