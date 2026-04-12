# 🧪 Testing Setup Checklist - 3D Print Commerce Platform

Complete this checklist to set up and test the entire application (Backend API + React Frontend).

---

## ✅ **PREREQUISITES** - Install Required Tools

### 1. **Node.js & npm**
- [ ] Download & install Node.js 18+ from [nodejs.org](https://nodejs.org)
- [ ] Verify installation:
  ```bash
  node --version    # Should be v18.0.0 or higher
  npm --version     # Should be 9.0.0 or higher
  ```

### 2. **PostgreSQL Database**
- [ ] Install PostgreSQL 15 from [postgresql.org](https://www.postgresql.org/download/)
- [ ] During installation:
  - [ ] Set superuser password (default user: `postgres`)
  - [ ] Remember this password - you'll need it for `.env`
  - [ ] Accept default port `5432`
- [ ] Verify installation (open pgAdmin or command line):
  ```bash
  psql --version    # Should be PostgreSQL 15.x
  ```

### 3. **Git** (Optional but recommended)
- [ ] Install Git from [git-scm.com](https://git-scm.com)
- [ ] Verify:
  ```bash
  git --version     # Should be 2.x or higher
  ```

### 4. **Code Editor**
- [ ] VS Code or your preferred editor (already have this)

---

## 🔧 **BACKEND SETUP**

### Step 1: Navigate to Backend Directory
```bash
cd e:\Projects\3DPrintCommerce\backend
```

### Step 2: Create `.env` File
- [ ] Copy `.env.example` to `.env`
  ```bash
  copy .env.example .env     # Windows: PowerShell/Git Bash
  # OR manually create `.env` with content below
  ```

### Step 3: Configure `.env` for Local Testing
Edit `.env` with these **MINIMAL** values for testing:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_3d_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
JWT_SECRET=dev_jwt_secret_key_12345
JWT_EXPIRE=7d
```

**Optional** (not needed for basic testing):
- Leave Razorpay, Email, AWS, Cloudinary blank for now
- They'll show errors but won't block core functionality

### Step 4: Install Backend Dependencies
```bash
npm install
```
> This reads `package.json` and installs all required packages
> - Express.js
> - PostgreSQL client
> - JWT libraries
> - CORS, dotenv, etc.

### Step 5: Create & Initialize Database
```bash
# Create database
npm run db:init

# OR manually create via PostgreSQL:
# psql -U postgres
# CREATE DATABASE ecommerce_3d_db;
# \q
```

### Step 6: Run Database Migrations
```bash
npm run migrate
```
> This creates all 13 tables (users, products, categories, orders, etc.)

### Step 7: Seed Sample Data (Optional but recommended)
```bash
npm run seed
```
> Adds test data: 5 users, 10 products, 3 categories
> **Test User Login Details:**
> - Email: `test@example.com`
> - Password: `password123`
> - Role: `customer`

### Step 8: Start Backend Server
```bash
npm start
# OR for auto-reload during development:
npm run dev
```

**You should see:**
```
Server running on port 3000
Database connected successfully
```

✅ **Backend is ready!** The API will be at `http://localhost:3000/api`

---

## 🎨 **FRONTEND SETUP**

### Step 1: Open New Terminal Window
Keep backend running. Open NEW terminal in same workspace.

### Step 2: Navigate to Web Directory
```bash
cd e:\Projects\3DPrintCommerce\web
```

### Step 3: Create `.env` File
```bash
copy .env.example .env     # Windows CMD/PowerShell
```

### Step 4: Configure `.env`
Edit `.env` with:
```env
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_RAZORPAY_KEY_ID=dummy_for_testing
```

### Step 5: Install Frontend Dependencies
```bash
npm install
```
> This reads `package.json` and installs:
> - React 18.2
> - React Router DOM
> - Axios
> - Other UI libraries

### Step 6: Start React Development Server
```bash
npm start
```

**You should see:**
```
Compiled successfully!
On Your Network: http://192.x.x.x:3000
Local: http://localhost:3000
```

React will auto-open at `http://localhost:3000` in your browser.

✅ **Frontend is ready!**

---

## 🧪 **TESTING CHECKLIST**

Your app is now running! Test these features:

### **1. Public Pages** (No login needed)
- [ ] Home page loads (`/`)
  - [ ] Hero banner displays
  - [ ] Featured products show (8 products)
  - [ ] Categories grid displays
  
- [ ] Products listing page (`/products`)
  - [ ] Product grid loads
  - [ ] Filter by category works
  - [ ] Search box filters products
  - [ ] Price range filter works
  - [ ] Sort dropdown changes order

- [ ] Product detail page (`/products/:id`)
  - [ ] Click product card → detail page loads
  - [ ] Product image, name, price, description show
  - [ ] Stock status displays
  - [ ] Add to cart button works
  - [ ] Reviews section shows (if any)

---

### **2. Authentication** (Registration & Login)

#### Registration
- [ ] Navigate to `/register`
- [ ] Fill form:
  - [ ] Name: "Test User"
  - [ ] Email: "newtest@example.com" (unique)
  - [ ] Password: "password123"
  - [ ] Confirm: "password123"
- [ ] Click Register
- [ ] Success: Redirected to home, logged in

#### Login
- [ ] Navigate to `/login`
- [ ] Enter test credentials:
  - [ ] Email: `test@example.com`
  - [ ] Password: `password123`
- [ ] Success: Redirected to home page, Navbar shows logout button

#### Profile Page
- [ ] Click "Profile" in navbar (only visible when logged in)
- [ ] See your name, email, role
- [ ] Click "Edit Profile" → edit name (email disabled)
- [ ] Click "Change Password" → enter old & new password
- [ ] Logout button works

---

### **3. Shopping Cart**

#### Add to Cart
- [ ] Go to Products page
- [ ] Click any product
- [ ] Select quantity
- [ ] Click "Add to Cart"
- [ ] See success message
- [ ] Navbar cart badge shows count (red dot)

#### View Cart
- [ ] Click Cart icon in navbar
- [ ] See items table with price × quantity
- [ ] See order summary (subtotal, tax, total)
- [ ] Adjust quantity with input
- [ ] Remove item button works
- [ ] Clear cart button works
- [ ] Empty cart shows "Continue Shopping" link

---

### **4. Checkout & Orders**

#### Checkout
- [ ] Proceed to Checkout from cart
- [ ] Fill shipping form:
  - [ ] Name, Email, Phone
  - [ ] Street, City, State, Zip
  - [ ] Country
- [ ] Click "Place Order"
- [ ] Success: Order created, cart cleared
- [ ] Redirected to order detail page

#### View Order History
- [ ] Click "Orders" in navbar
- [ ] See table of all your orders
  - [ ] Order ID, date, total, status, item count
  - [ ] Status badge colored (pending=red, paid=green, etc.)
- [ ] Click order ID → order detail page

#### Order Detail
- [ ] See full order info:
  - [ ] Order ID, date, status
  - [ ] Items table (product, qty, price)
  - [ ] Shipping address
- [ ] Status progression visible

---

### **5. Admin Features** (Need admin user)

#### Login as Admin
- [ ] Logout first
- [ ] Login with admin account (you may need to manually promote a user)
- [ ] Navbar shows "Admin" link
- [ ] Click Admin → Admin Dashboard

#### Admin Dashboard (`/admin`)
- [ ] See metrics cards:
  - [ ] Total Products count
  - [ ] Total Orders count
  - [ ] Total Revenue (₹)
  - [ ] Pending Orders count
  - [ ] Shipped Orders count
  - [ ] Delivered Orders count
- [ ] Navigation tiles to Inventory & Fulfillment

#### Inventory Management (`/admin/inventory`)
- [ ] See all products with stock levels
- [ ] Low stock items highlighted (red ⚠)
- [ ] Adjust Inventory form:
  - [ ] Select product dropdown
  - [ ] Enter quantity change (+/-)
  - [ ] Select reason (manual, return, damage, restock)
  - [ ] Click "Update Stock"
- [ ] See Low Stock alerts sidebar

#### Fulfillment Queue (`/admin/fulfillment`)
- [ ] See order queue table
  - [ ] Order ID, date, total, item count, status
- [ ] Fulfillment metrics sidebar:
  - [ ] Pending orders count
  - [ ] Average fulfillment time
  - [ ] Fulfillment rate %
- [ ] Update Order form:
  - [ ] Select order from dropdown
  - [ ] Change status (paid → shipped → delivered)
  - [ ] Add tracking number (optional)
  - [ ] Click "Update Order"

---

## 🐛 **TROUBLESHOOTING**

### Backend Won't Start
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** PostgreSQL not running
- Windows: Open Services → Start "PostgreSQL"
- OR run from PostgreSQL bin: `pg_ctl start`

---

### Database Connection Failed
```
Error: FATAL: role "postgres" does not exist
```
**Solution:** Wrong PostgreSQL password in `.env`
- Re-check your PostgreSQL superuser password

---

### Frontend Can't Connect to API
```
CORS error or API_BASE_URL 404
```
**Solution:** 
- [ ] Backend running? `npm start` in backend folder
- [ ] Check `.env`: `REACT_APP_API_BASE_URL=http://localhost:3000/api`
- [ ] Restart React: Stop (`Ctrl+C`) and `npm start` again

---

### Port Already in Use
```
Port 3000 is already in use
```
**Solution:**
```bash
# Kill process on port 3000 (Windows PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# OR change PORT in .env to 3001
```

---

## 📱 **WHAT YOU CAN TEST NOW**

✅ **Working:**
- [ ] All 15 routes (public, protected, admin)
- [ ] 13 database tables & CRUD operations
- [ ] User authentication (register/login/logout)
- [ ] Product filtering & search
- [ ] Shopping cart management
- [ ] Order creation & tracking
- [ ] Admin dashboard & inventory management
- [ ] Order fulfillment tracking
- [ ] Responsive design on mobile breakpoint

❌ **Not Yet Active** (can ignore for now):
- Razorpay payment gateway (backend webhook ready, UI not hooked)
- Email notifications (can configure later)
- File uploads (AWS S3 / Cloudinary not required)
- Review system (database ready, routes not implemented)

---

## 📋 **QUICK START REFERENCE**

**Terminal 1 - Backend:**
```bash
cd e:\Projects\3DPrintCommerce\backend
npm install
npm run migrate
npm run seed
npm start
```

**Terminal 2 - Frontend:**
```bash
cd e:\Projects\3DPrintCommerce\web
npm install
npm start
```

**Browser:** Open `http://localhost:3000`

---

## ✨ **NEXT STEPS AFTER TESTING**

1. **If all tests pass:**
   - Document any bugs found
   - Decide on next features:
     - Review system
     - Razorpay payment UI
     - Email notifications
     - File uploads

2. **If issues found:**
   - Check terminal error messages
   - Consult troubleshooting section above
   - Check `.env` file matches this template

3. **To Deploy Later:**
   - Use `docker-compose.yml` for production setup
   - See `DOCKER_SETUP.md` for containerization

---

**You're all set! 🚀 Happy testing!**
