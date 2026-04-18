---
applyTo:
  - e:\Projects\3DPrintCommerce\**
autoReferences:
  - e:\Projects\3DPrintCommerce\**\*.{ts,js,jsx,tsx,json,md}
  - e:\Projects\3DPrintCommerce\src\**
description: "3D Product Ecommerce Platform - Multi-phase development guide with auto-referencing"
---

# Plan: 3D Printed Product Ecommerce Platform

## Project Context
You are working on the **3D Printed Product Ecommerce Platform** project. This is a comprehensive cross-platform ecommerce solution with custom 3D printing capabilities organized into 5 phases.

### Guidelines
- **Always reference this plan** at `plan-3dProductEcommerce-custom-orders.prompt.md` to track progress
- **Check the current Phase** in this document before starting any task
- **Phases 1-4** focus on standard product orders; **Phase 5** adds custom 3D printing with file validation
- **After completing tasks**, remind the user to update the current phase status in this plan
- **Reference the Architecture** section when discussing backend, frontend, or database decisions
- **Follow the Data Model** schema when creating migrations or database operations

---

## TL;DR
Build a cross-platform ecommerce site (web + iOS/Android native apps) with dual UX for end users (browse, buy, review, submit custom designs) and yourself (product & order management). Use Node.js/Express backend + React web + React Native mobile + UPI payments (Razorpay) + PostgreSQL + Email notifications (SendGrid/Nodemailer). MVP in 5 weeks covering: standard product orders (Phases 1-4) + custom 3D printing orders with file validation (STL, 3DM, OBJ) + virus scanning (Phase 5). Email notifications sent at key milestones (order confirmation, status updates, custom order quotes).

---

## Architecture Overview

### Backend (Shared API)
- **Server**: Node.js + Express REST API
- **Database**: PostgreSQL (relational schema for products, orders, users, inventory, custom orders)
- **Auth**: JWT-based authentication (token in localStorage for web, secure storage for React Native)
- **Social Auth**: Google OAuth 2.0 and Facebook OAuth via Passport.js (`passport-google-oauth20`, `passport-facebook`). Auto-links to existing email/password account if same email found — no duplicate accounts. Admin account cannot use social login.
- **Admin Auth**: `is_seller` flag on the `users` table identifies the admin/owner account. All `/api/admin/*` routes are protected by `requireAdmin` middleware that checks `req.user.is_seller === true`. Any request from a non-admin user returns `403 Forbidden`.
- **Payment**: Razorpay UPI integration (webhook for payment callbacks)
- **Email**: SendGrid or Nodemailer for transactional emails (**Decision: use Nodemailer for MVP, migrate to SendGrid for production**)
- **Email Queue**: Bull + Redis for async email processing (**Decision: Bull + Redis is the chosen queue; Agenda/MongoDB is not used**)
- **File Validation**: Magic byte detection (file-type library) + format verification
- **Virus Scanning**: ClamAV (self-hosted) or VirusTotal API integration
- **File Storage**: AWS S3 or Cloudinary (private access, secure URLs)
- **Error Handling**: All API errors return a consistent JSON shape: `{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }`. HTTP status codes follow REST conventions (400 bad request, 401 unauthenticated, 403 forbidden, 404 not found, 422 validation error, 500 server error).
- **Rate Limiting**: `express-rate-limit` applied globally (100 req/15 min per IP) and tighter limits on auth endpoints (10 req/15 min) and file upload endpoints (20 req/hour).

### Deployment & Infrastructure
- **Local Development**: Docker Compose (PostgreSQL in container)
- **Database**: PostgreSQL 15 Alpine image (dockerized)
- **Backend Container**: Node.js 18 Alpine (optional, for production)
- **Networks**: Docker bridge network for isolated service communication
- **Environment Config**: .env files for local/staging/production (no code changes)
- **Data Persistence**: Docker volumes for PostgreSQL data
- **Production Deployment**: Docker containers in Linux environment
- **Scaling**: Start with docker-compose on single server; migrate to Kubernetes if 100K+ daily users

### Frontend (Dual Layer)
1. **Web**: React + React Router + UI library (Shadcn/Material-UI/Ant Design) + Tailwind CSS
2. **Mobile**: React Native with shared business logic, platform-specific UI adaptations

### Folder Structure (Monorepo Recommended)
```
ecommerce-3d-products/
├── backend/                 (Node.js/Express)
│   ├── src/
│   │   ├── models/         (User, Product, Order, Review, Inventory, CustomOrder, CustomOrderFile)
│   │   ├── routes/         (auth, products, orders, reviews, admin, customOrders)
│   │   ├── middleware/     (auth, validation, error handling, fileUpload)
│   │   ├── controllers/    (business logic)
│   │   ├── services/       (fileValidation, virusScan, s3Upload)
│   │   └── config/         (DB, Razorpay, environment, ClamAV)
│   └── package.json
├── web/                     (React)
│   ├── src/
│   │   ├── pages/          (Home, ProductDetail, Cart, Checkout, Orders, AdminDashboard, CustomOrder, CustomOrderDetail)
│   │   ├── components/     (Header, ProductCard, CartItem, PaymentModal, FileUpload, FileValidationDisplay)
│   │   ├── hooks/          (useAuth, useCart, useProducts, useCustomOrders)
│   │   ├── context/        (AuthContext, CartContext)
│   │   └── services/       (api.js for backend calls)
│   └── package.json
├── mobile/                  (React Native)
│   ├── src/
│   │   ├── screens/        (Home, ProductDetail, Cart, Checkout, OrderHistory, AdminDashboard, CustomOrder, CustomOrderDetail)
│   │   ├── components/     (shared ProductCard, CartItem, FileUpload, etc.)
│   │   ├── hooks/          (shared useAuth, useCart, useProducts, useCustomOrders)
│   │   ├── context/        (shared AuthContext, CartContext)
│   │   └── services/       (shared api.js)
│   └── package.json
└── shared/                  (Optional: shared utils, types, validators)
    ├── validators.js
    ├── constants.js
    ├── fileValidation.js   (STL, 3DM, OBJ format checking)
    └── types.ts (if using TypeScript)
```

---

## Environment Setup & Initial Configuration

### Local Development Setup
All developers should follow this setup to ensure consistent environments:

1. **Install Docker Desktop** ([download](https://www.docker.com/products/docker-desktop))
   - Includes Docker Engine and Docker Compose
   - Works on Windows, Mac, and Linux

2. **Start PostgreSQL Container**
   ```bash
   docker-compose up -d
   ```
   - PostgreSQL runs in isolated container
   - Guarantees same environment across all machines and production

3. **Initialize Backend**
   ```bash
   cd backend
   npm install
   npm run setup-db:seed
   ```
   - Installs dependencies
   - Creates database schema (13 tables)
   - Seeds sample data for testing

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   - Backend runs on `http://localhost:3000`
   - Hot-reload enabled with nodemon
   - Connected to PostgreSQL via docker network

### Documentation References
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** — Complete Docker guide, troubleshooting, commands
- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** — Database initialization, migrations, schema
- **[SCHEMA.md](SCHEMA.md)** — ER diagram, relationships, query patterns
- **[README.md](README.md)** — Project overview and quick start

### Environment Variables
**Development** (default in .env.docker):
```env
DB_HOST=postgres          # Docker service name
DB_PORT=5432
DB_NAME=ecommerce_3d_db
DB_USER=postgres
DB_PASSWORD=postgres      # Change in staging/production!
```

**Staging/Production**: Change only .env values, code remains identical

---

## Admin Account Creation

### How Admin Accounts Work
This is a single-seller platform — there is exactly one admin/owner account. The `is_seller` column on the `users` table is the flag that grants admin access. Regular users always have `is_seller = false`. The admin has `is_seller = true`.

The admin account is **never created through the public registration endpoint** (`POST /api/auth/register`). That endpoint always creates regular users. This prevents anyone from self-promoting to admin.

### Recommended Approach: Seed Script (MVP)
The simplest and most common approach for a single-owner store is to create the admin account via a database seed script that runs once during initial setup.

**`backend/scripts/create-admin.js`**
```js
// Run once: node scripts/create-admin.js
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@yourstore.com';
  const password = process.env.ADMIN_PASSWORD; // MUST be set in env, no default
  if (!password) throw new Error('ADMIN_PASSWORD env variable is required');

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (email, password_hash, name, is_seller)
     VALUES ($1, $2, 'Store Owner', true)
     ON CONFLICT (email) DO NOTHING`,
    [email, hash]
  );
  console.log(`Admin account created: ${email}`);
  process.exit(0);
}

createAdmin().catch(err => { console.error(err); process.exit(1); });
```

Add to `package.json` scripts:
```json
"create-admin": "node scripts/create-admin.js"
```

Run once after DB setup:
```bash
ADMIN_EMAIL=admin@yourstore.com ADMIN_PASSWORD=StrongPass123! npm run create-admin
```

### Environment Variables for Admin
Add to `.env`:
```env
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=your_strong_password_here   # Only used by create-admin script
```

### Security Rules
- `POST /api/auth/register` always sets `is_seller = false` — no exceptions
- There is no API endpoint to promote a user to admin (out of scope for MVP)
- The `requireAdmin` middleware checks `req.user.is_seller === true` on every admin route
- Admin password should be strong (16+ chars) and stored only in `.env` (never committed to git)
- The seed script uses `ON CONFLICT DO NOTHING` so re-running it is safe

### Alternative: SQL Seed File
If you prefer to handle it in the SQL migration/seed files:
```sql
-- In backend/seeds/001-initial-seed.sql
-- Replace 'HASHED_PASSWORD_HERE' with the bcrypt hash generated separately
INSERT INTO users (email, password_hash, name, is_seller)
VALUES ('admin@yourstore.com', 'HASHED_PASSWORD_HERE', 'Store Owner', true)
ON CONFLICT (email) DO NOTHING;
```
Generate the hash with: `node -e "require('bcrypt').hash('YourPassword', 12).then(console.log)"`

### Admin Login Flow
Admin logs in through the same `POST /api/auth/login` endpoint as regular users. The JWT payload includes `{ id, email, is_seller }`. The frontend checks `is_seller` to show/hide admin navigation. The backend `requireAdmin` middleware independently verifies `is_seller` on every protected route — the frontend check is UI-only and not a security boundary.

---

## Data Model (PostgreSQL Schema)

### Core Tables

#### users
- `id` (PK, UUID)
- `email` (unique, nullable — social-only users may not have email if provider withholds it)
- `password_hash` (nullable — NULL for social-only accounts)
- `name`
- `phone`
- `address` (JSON or separate address table)
- `is_seller` (boolean, always false for end users; true for owner)
- `google_id` (VARCHAR, unique, nullable — set when user links Google)
- `facebook_id` (VARCHAR, unique, nullable — set when user links Facebook)
- `avatar_url` (TEXT, nullable — profile picture from social provider)
- `created_at`
- `updated_at`

> **Account linking rule**: If a social login returns an email that already exists in the DB, the `google_id`/`facebook_id` is added to that existing user row — no duplicate account is created. A user must always have at least one login method (password OR a linked social provider).

#### products
- `id` (PK, UUID)
- `seller_id` (FK to users) — MVP: always points to owner/admin account
- `name`
- `description`
- `price` (decimal)
- `quantity_in_stock` (integer)
- `category_id` (FK to categories)
- `image_urls` (JSON array of URLs)
- `created_at`
- `updated_at`

#### categories (NEW - pulled from Phase 3 requirements)
- `id` (PK, UUID)
- `name` (varchar, unique)
- `description` (text, optional)
- `created_at`
- `updated_at`

#### orders
- `id` (PK, UUID)
- `user_id` (FK to users) — buyer
- `seller_id` (FK to users) — MVP: always owner/admin; reserved for future multi-seller
- `status` (VARCHAR enforced by enum type: pending, paid, shipped, delivered)
- `total_price` (decimal)
- `razorpay_order_id` (string, indexed for webhook matching)
- `created_at`
- `updated_at`

#### order_items
- `id` (PK, UUID)
- `order_id` (FK to orders)
- `product_id` (FK to products)
- `quantity` (integer)
- `price_at_purchase` (decimal, snapshot of product price)

#### reviews
- `id` (PK, UUID)
- `product_id` (FK to products)
- `user_id` (FK to users, indexed for finding user's reviews)
- `rating` (integer, 1-5)
- `text` (text)
- `created_at`
- `updated_at` (allow review edits)

#### inventory_logs
- `id` (PK, UUID)
- `product_id` (FK to products, indexed)
- `action` (string: add/remove/sold — what happened)
- `quantity_delta` (integer: +n or -n — clearer than "quantity")
- `reason` (string: "restocking", "purchase", "manual_adjustment" — why it happened)
- `created_at`
- (Note: Only log creation time; immutable transaction record)

#### custom_orders (NEW - Phase 5)
- `id` (PK, UUID)
- `user_id` (FK to users) — customer
- `seller_id` (FK to users) — MVP: always owner/admin
- `status` (VARCHAR enforced by enum type: submitted, validating, approved, in_production, completed) [NO cancelled — if user cancels, order stays in any previous state; not used in MVP]
- `description` (text, project brief/notes from user)
- `estimated_cost` (decimal, quoted price before payment)
- `total_price` (decimal, final price after approval and payment)
- `razorpay_order_id` (string, for webhook matching after payment)
- `delivery_date_estimate` (timestamp)
- `created_at`
- `updated_at`

#### custom_order_files (NEW - Phase 5)
- `id` (PK, UUID)
- `custom_order_id` (FK to custom_orders, indexed)
- `original_filename` (string, user's uploaded filename)
- `file_format` (VARCHAR: stl, 3dm, obj)
- `file_size_bytes` (integer)
- `file_url` (string, URL to stored file on S3/Cloudinary)
- `validation_status` (VARCHAR: pending, validated, error)
- `validation_errors` (JSONB array, details of any validation issues)
- `virus_scan_status` (VARCHAR: pending, clean, infected)
- `virus_scan_result` (JSONB, full scan details from ClamAV/VirusTotal)
- `uploaded_at` (timestamp — when file was uploaded; set on INSERT)
- `created_at` (timestamp — alias for uploaded_at for consistency)

#### email_logs (NEW - Audit Trail)
- `id` (PK, UUID)
- `email_type` (VARCHAR: order_confirmation, order_status_update, custom_order_received, custom_order_quote, custom_order_confirmed, custom_order_in_production, custom_order_completed)
- `recipient_email` (VARCHAR, indexed)
- `subject` (varchar)
- `status` (VARCHAR: sent, failed, bounced)
- `error_message` (text, nullable — details if failed)
- `order_id` or `custom_order_id` (UUID, nullable — reference to related order)
- `created_at`
- (Note: Immutable transaction log; no updates. Enables audit trail and troubleshooting)

---

## Feature Breakdown & Implementation Phases

### Phase 1: Core MVP (Week 1)

#### End User Features
- [ ] User registration/login (email + password)
- [ ] Social login: Sign in with Google (OAuth 2.0)
- [ ] Social login: Sign in with Facebook (OAuth 2.0)
- [ ] Account linking: if social login email matches existing account, link automatically (no duplicate accounts)
- [ ] Browse products on home page (grid layout)
- [ ] Product detail page (images, description, price, reviews, ratings)
- [ ] Add to cart & view cart
- [ ] Update cart quantities and remove items
- [ ] Checkout flow: address form + UPI payment
- [ ] Order confirmation page

#### Business Owner Features
- [ ] Admin login (separate `/admin` route)
- [ ] View all products listing
- [ ] Edit product (name, price, description, images)
- [ ] View all orders (list with status)
- [ ] View order details (items, user info, price breakdown)

#### Infrastructure & Integrations
- [ ] Express.js API setup (basic structure)
- [ ] PostgreSQL database + migrations
- [ ] User authentication (JWT tokens, password hashing with bcrypt)
- [ ] Social auth: Passport.js with `passport-google-oauth20` and `passport-facebook`
- [ ] OAuth callback routes: `GET /api/auth/google`, `GET /api/auth/google/callback`, `GET /api/auth/facebook`, `GET /api/auth/facebook/callback`
- [ ] Account linking logic: auto-link by email on first social login
- [ ] Razorpay UPI integration (payment order creation)
- [ ] Razorpay webhook handler (order status update on payment success)
- [ ] Email service setup (SendGrid, Nodemailer, or AWS SES)
- [ ] Email template system (order confirmation email)
- [ ] Email queue/job system (Bull, Agenda, or simple async queue)

#### Verification Steps (Phase 1)
- [ ] Create user account → login → token persists
- [ ] Click "Sign in with Google" → redirected to Google → approve → logged in, JWT issued
- [ ] Click "Sign in with Facebook" → redirected to Facebook → approve → logged in, JWT issued
- [ ] Register with email, then sign in with Google (same email) → same account, google_id linked, no duplicate
- [ ] Add product (admin) → appears on home page
- [ ] Click product → detail page loads with images, description
- [ ] Add product to cart → view cart → quantities correct
- [ ] Checkout: enter address → UPI payment (Razorpay sandbox)
- [ ] Order created in DB → status updates to "paid" after webhook
- [ ] Admin: view new order in orders list
- [ ] User receives order confirmation email with order ID, items, total price

---

### Phase 2: Inventory & Order Management (Week 2)

#### Business Owner Features
- [ ] Manage product inventory: add/remove stock manually
- [ ] Update order status (pending → paid → shipped → delivered)
- [ ] View inventory logs (track all stock changes with reasons)
- [ ] Low stock alerts/warnings

#### End User Features
- [ ] View order history (all past orders)
- [ ] Order detail page (items, status, order date, total)
- [ ] Order status tracking (see current status: pending, paid, shipped, delivered)
- [ ] Email notifications: When order status changes (paid, shipped, delivered)
  - "Your order has been shipped! Order ID: [ID]"
  - "Your order has been delivered! Rate & review the product."

#### Automatic Updates
- [ ] Stock decrements automatically when order is paid
- [ ] Stock increases when admin restocks

#### Verification Steps (Phase 2)
- [ ] Admin: add stock to product → inventory increases
- [ ] User: place order & pay → stock decrements automatically
- [ ] User: view order history → all past orders listed
- [ ] Admin: update order status → user sees status change in real-time (or on refresh)
- [ ] Admin: view inventory logs → see all stock changes with reasons
- [ ] Admin updates order to "shipped" → user receives email "Your order has been shipped!"
- [ ] Admin updates order to "delivered" → user receives email "Your order has been delivered!"

---

### Phase 3: Search, Reviews, & Polish (Week 2-3)

#### End User Features
- [ ] Search products by name
- [ ] Filter products by category
- [ ] Filter products by price range
- [ ] Sort products (price asc/desc, newest, best rated)
- [ ] Leave reviews/ratings on products (1-5 stars + text)
- [ ] View reviews from other users on product detail
- [ ] Responsive design for mobile viewport (375px)
- [ ] Tablet view optimization (768px)

#### Error Handling & Validation
- [ ] Input validation (email format, password strength, address fields)
- [ ] Error messages for payment failures
- [ ] Timeout handling for API calls
- [ ] 404 pages for missing products/orders

#### UI/UX Polish
- [ ] Loading spinners during async operations
- [ ] Confirmation modals for destructive actions (delete product, cancel order)
- [ ] Toast notifications for success/error messages
- [ ] Smooth transitions and animations

#### Verification Steps (Phase 3)
- [ ] Search: type product name → correct product appears
- [ ] Filter: select category → only that category shows
- [ ] Filter: set price range $X-$Y → only products in range show
- [ ] Sort: click "Price (Low to High)" → products reorder
- [ ] Review: user leaves 4-star review + text → appears on product detail
- [ ] Web: resize window to 375px → layout adapts (stack vertically)
- [ ] Web: resize to 768px → tablet layout looks good
- [ ] Submit form with invalid email → error message shows
- [ ] Payment fails (sandbox) → error shown, order status remains pending

---

### Phase 4: React Native Mobile Apps (Week 3-4, *parallel with Phase 3*)

#### Setup & Architecture
- [ ] React Native project setup (Expo or bare RN)
- [ ] React Navigation setup (stack, tab, drawer navigators)
- [ ] Reuse web business logic: `context/`, `services/api.js`, validators
- [ ] Platform-specific UI: iOS navigation style vs. Android Material Design

#### Screens to Build
- [ ] Home (product grid, search/filter bar)
- [ ] Product Detail (images, reviews, add to cart)
- [ ] Cart (items, quantities, checkout button)
- [ ] Checkout (address form, payment modal)
- [ ] Order History (user's past orders)
- [ ] Order Detail (specific order info)
- [ ] Admin Dashboard (sales summary, recent orders)
- [ ] Admin Products (product list, CRUD)
- [ ] Admin Orders (order list, status updates)

#### Key Considerations
- [ ] Use React Native's platform-specific components (TabBarIOS vs. BottomTabNavigator)
- [ ] Touch-friendly button/input sizes (min 44x44 pt)
- [ ] Handle safe areas (notches, home indicators)
- [ ] Image optimization for mobile networks
- [ ] Secure token storage (React Native Secure Storage, not localStorage)
- [ ] No new backend API endpoints needed — Phase 1-3 API is sufficient for mobile
- [ ] Push notification tokens are out of scope for MVP (use email notifications only)

#### Build & Deployment
- [ ] Build APK for Android testing
- [ ] Build IPA for iOS testing (TestFlight or simulator)
- [ ] Test on real device or emulator
- [ ] Set up Google Play Store & Apple App Store developer accounts

#### Verification Steps (Phase 4)
- [ ] Run on Android Emulator → all screens navigate correctly
- [ ] Run on iOS Simulator → all screens navigate correctly
- [ ] Add product to cart on mobile → cart updates
- [ ] Checkout on mobile → address form works, payment modal shows
- [ ] Build APK → install on Android device → app runs
- [ ] Build IPA → TestFlight → install on real iPhone → all features work

---

### Phase 5: Custom 3D Printing Orders (Week 4-5, post-MVP)

#### End User Features
- [ ] Button on home page: "Order Custom Print"
- [ ] Custom Order Submission Page
  - Rich text area for project description/brief
  - File upload (drag & drop or file picker)
  - Accept formats: **STL, 3DM, OBJ** (file extension + magic byte validation)
  - File size limit: **100MB per file**
  - Show file upload progress (percentage)
  - Display validation results (format check ✓, integrity check ✓, virus scan ✓)
  - Show any validation errors clearly (corrupted file, infected file, unsupported format)
- [ ] Request form after successful file upload:
  - Desired color (dropdown or color picker)
  - Material type (PLA, PETG, ABS, Nylon, Resin, etc.)
  - Quantity (how many prints)
  - Special requirements (text area)
- [ ] Quote page: View estimated cost + delivery date + file details
- [ ] Add to cart or "Request Quote" option
- [ ] Checkout with UPI payment (same flow as standard orders)
- [ ] Order tracking for custom orders (status: submitted → validating → approved → in_production → completed)
- [ ] Email notifications:
  - "Your custom order has been received" (on submission)
  - "Your custom order quote is ready: $X, delivery by [date]" (when approved)
  - "Your custom order is in production" (when admin marks in_production)
  - "Your custom order is completed!" (when admin marks completed)

#### Business Owner Features
- [ ] Admin: Custom Orders Dashboard
  - View all custom order submissions (list with status, user, submission date)
  - Click to see full details: uploaded file(s), file validation results, virus scan results, user description, requested specs
  - Download button to access user files securely (only admin can access)
  - 3D file preview (if possible) or file info display
  - Validation results summary (✓ Format valid, ✓ Integrity confirmed, ✓ Security scan passed)
  - Assign estimated cost & delivery date
  - Approve/reject order (sends quote to user or rejection reason)
- [ ] Once user pays: mark custom order as "in_production"
- [ ] Update status to "completed" when order is fulfilled
- [ ] Auto-delete uploaded files after order completion + 30-day retention period

#### File Validation & Security (Critical)
- [ ] **Format Validation** (accept only STL, 3DM, OBJ):
  - Check file extension matches one of: .stl, .3dm, .obj (case-insensitive)
  - Verify magic bytes (file signature) to prevent renamed malicious files:
    - **STL**: ASCII (starts with "solid", text-based) OR binary (84-byte header + triangle data)
    - **3DM**: Rhino format (starts with specific binary header "3D Geometry File Format")
    - **OBJ**: Text format (starts with "#" comment or geometry commands like "v", "f", "vn")
- [ ] **File Integrity Check**: Parse file headers, attempt to read initial chunks to verify not corrupted
- [ ] **Virus/Malware Scanning** (MANDATORY before user can proceed):
  - Integrate **ClamAV** (self-hosted, open-source) OR **VirusTotal API** (cloud-based)
  - Scan asynchronously after upload (show "Scanning for viruses..." message)
  - Block order processing if file is infected
  - Display warning to user: "File failed security scan. Please contact support."
  - Log incident in admin panel with scan results
- [ ] **File Size Limit**: Enforce 100MB max per file (show clear error if exceeded)
- [ ] **Storage Security**:
  - Upload to **AWS S3** with private ACL (not publicly accessible) OR **Cloudinary** with authentication
  - Generate **signed/secure download URLs** (expire after 24 hours)
  - Admin can only download through backend (no direct S3 access from frontend)
  - Auto-delete files from storage after 30 days post-completion
  - Never store files on web server directly (security risk)

#### File Format Specifications (Reference)

**STL (Stereolithography)**
- ASCII: Text file starting with "solid <name>", contains triangle vertices
- Binary: 80-byte header + 4-byte triangle count + triangle data (50 bytes each)
- Used for: 3D printing, CAD models

**3DM (Rhino 3D Model)**
- Binary format specific to Rhino 3D
- Header: "3D Geometry File Format" followed by version & metadata
- Contains: Geometry, surfaces, curves, text, layers

**OBJ (Wavefront OBJ)**
- Text format (ASCII)
- Lines start with: "v" (vertex), "vn" (normal), "vt" (texture), "f" (face), "mtllib" (material), etc.
- Comments start with "#"
- Human-readable, widely supported

#### Database & API Changes
**New Tables**: custom_orders, custom_order_files (schemas above)

**File Upload Flow (Two-Step)**:
The custom order creation is a two-step process to keep the API clean and handle large files reliably:
1. **Step 1 — Upload file**: `POST /api/custom-orders/upload` — multipart/form-data, returns `{ fileId, validationStatus }`. File is uploaded to S3/Cloudinary and validation begins asynchronously.
2. **Step 2 — Create order**: `POST /api/custom-orders` — JSON body with `{ fileId, description, color, material, quantity, specialRequirements }`. References the already-uploaded file. Only allowed if `validationStatus === 'validated'` and `virusScanStatus === 'clean'`.

This avoids bundling a 100MB file upload with form data in a single request and makes retry logic simpler.

**New Backend Routes**:
- `POST /api/custom-orders/upload` (Step 1: upload file, returns fileId + starts async validation)
- `POST /api/custom-orders` (Step 2: create order referencing validated fileId)
- `GET /api/custom-orders` (user's custom orders list)
- `GET /api/custom-orders/:id` (custom order detail + file info)
- `POST /api/custom-orders/:id/files/:fileId/download` (admin downloads file securely)
- `PUT /api/custom-orders/:id/quote` (admin approves, sets final price & delivery date)
- `PUT /api/custom-orders/:id/status` (admin updates status: submitted → validating → approved → in_production → completed)
- `GET /api/admin/custom-orders` (owner-only: all custom orders)
- `GET /api/custom-orders/:id/validation-status` (poll validation progress after Step 1)

**New Middleware**:
- `fileUploadMiddleware.js`: Handle multipart/form-data, size limits, type checks
- `fileValidationMiddleware.js`: Async validation (format + magic bytes + virus scan)

**New Services**:
- `fileValidator.js`: Magic byte detection, format verification (file-type library)
- `virusScanner.js`: ClamAV socket client OR VirusTotal API wrapper
- `s3Uploader.js` or `cloudinaryUploader.js`: Secure file storage

#### Verification Steps (Phase 5)
- [ ] User: Visit home page → see "Order Custom Print" button
- [ ] User: Click button → Custom Order page loads with file upload area
- [ ] User: Upload valid STL file (50MB) → File validation shows: "✓ Format valid, ✓ File integrity confirmed, ✓ Security scan passed"
- [ ] User:Upload corrupted STL → Error message "File appears to be corrupted. Please ensure the file is a valid STL format and try again."
- [ ] User: Upload OBJ file with .stl extension (fake) → Rejected "File format mismatch. Please upload a valid STL, 3DM, or OBJ file."
- [ ] User: Upload 150MB file → Error "File size exceeds 100MB limit"
- [ ] User: Upload infected file (mock with EICAR test) → Error "File failed security scan. It may contain malware. Please contact support."
- [ ] User: Submit form with valid file + description + specs → custom order created, shows "submitted" status
- [ ] User receives email: "Your custom order has been received. We'll review and send you a quote soon."
- [ ] Admin: View custom order dashboard → see order in list
- [ ] Admin: Click order → see file info, validation results (all ✓), download button, and specs
- [ ] Admin: Download file → secure URL works, can access file
- [ ] Admin: Set quote to $50, delivery date 2026-04-20 → user receives email with quote
- [ ] User: Sees quote on order detail, clicks "Pay" → checkout with Razorpay
- [ ] User: Completes payment → order status updates to "approved", receives "Quote approved" email
- [ ] Admin: Updates status → "in_production" → user receives email "Your custom order is in production"
- [ ] Admin: Updates status to "completed" → user receives email "Your custom order is completed!"
- [ ] User: Tracks custom order status in order history

---

## Key User Workflows

### End User – Purchase Flow (Standard Products)
1. **Browse**: Open app/web → see featured products on home
2. **Search/Filter**: Type product name OR select category/price range
3. **View Details**: Click product card → see images, description, reviews, ratings
4. **Add to Cart**: Click "Add to Cart" button → see confirmation toast
5. **Review Cart**: Click cart icon → see all items, quantities, total price
6. **Checkout**: Click "Proceed to Checkout"
   - Enter/confirm shipping address
   - Review order summary
   - Click "Pay with UPI"
7. **Payment**: Razorpay UPI modal opens → user scans QR or selects UPI app → confirms payment
8. **Confirmation**: Order created → confirmation page shows order ID & items
9. **Track Order**: View order in "My Orders" → see status updates (paid → shipped → delivered)
10. **Review Product**: Click product in order → leave 1-5 star review + comment

### End User – Custom Order Flow (NEW - Phase 5)
1. **Browse Home**: See "Order Custom Print" call-to-action
2. **Click "Order Custom Print"**: Navigate to Custom Order submission page
3. **Describe Project**: Fill text area with project brief/requirements
4. **Upload Design File**:
   - Drag & drop or click to browse
   - Select STL, 3DM, or OBJ file
   - See upload progress
   - Validation runs: format check ✓ → integrity check ✓ → virus scan ✓
5. **Fill Specs Form**:
   - Select color
   - Choose material (PLA/PETG/etc.)
   - Enter quantity
   - Add special requirements
6. **Submit**: Click "Submit for Quote"
7. **Wait for Quote**: Order status shows "validating" → "approved" with admin's quote
8. **Review Quote**: See estimated cost & delivery date
9. **Proceed to Checkout**: Click "Confirm & Pay"
10. **Pay**: Razorpay UPI checkout → confirm payment
11. **Track**: Monitor custom order in "My Orders" → submitted → in_production → completed

### Business Owner – Product Management Flow (Phases 1-4)
1. **Login**: Navigate to `/admin` → enter credentials → access admin dashboard
2. **View Products**: See all products in a list/grid with edit buttons
3. **Add Product**: Fill form (name, price, description, category, images) → Save
4. **Edit Product**: Select product → update details → Save
5. **Manage Inventory**: View stock levels, add/remove quantities, see logs
6. **Manage Orders**: View all orders, update status, track customer orders

### Business Owner – Custom Order Management (NEW - Phase 5)
1. **Login to Admin**: Same as standard flow
2. **Navigate**: Click "Custom Orders" tab on admin dashboard
3. **View Queue**: See all custom orders (submitted, validating, approved, in_production, completed)
4. **Review Order**: Click order → see:
   - User's project description
   - Uploaded file(s) with validation results (✓ all passed)
   - File size & format info
   - Virus scan details ("Passed - No threats detected")
   - Requested specs (color, material, quantity)
5. **Download File**: Click "Download" → secure signed URL (expires in 24h)
   - Pass URL to production team
6. **Review & Quote**: 
   - Estimate cost based on file complexity & materials
   - Set delivery date
   - Click "Approve Quote"
7. **User Receives Quote**: User sees price & delivery date on order detail
8. **User Pays**: Custom order moves to "approved" status
9. **Update Status**: Change to "in_production" when work starts
10. **Complete**: Change to "completed" when order is fulfilled
11. **File Auto-Purge**: System auto-deletes file 30 days after completion (for data storage optimization)

### Payment Webhook Flow
1. User clicks "Confirm Payment" on Razorpay UPI modal
2. User completes UPI transaction
3. Razorpay calls backend webhook: `POST /webhooks/razorpay`
4. Backend:
   - **Verifies webhook signature** using HMAC-SHA256: `crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex')` — compare against `X-Razorpay-Signature` header. Reject with `400` if mismatch.
   - Updates order status to "paid"
   - Decrements product stock (if standard order)
   - Creates inventory logs
5. Frontend detects change → shows success page

> **Note**: `RAZORPAY_WEBHOOK_SECRET` is a separate secret from `RAZORPAY_KEY_SECRET`. Set it in Razorpay dashboard under Webhooks and add it to `.env`.

---

## Component Structure

### Web/Mobile – Shared Components
- **Header/Navigation**: Logo, search bar, user menu, cart icon
- **ProductCard**: Image, name, price, rating, add-to-cart button
- **CartItem**: Product image, name, qty selector, remove button
- **ReviewCard**: Reviewer info, rating, comment, date
- **Button**: Primary, secondary, danger variants
- **Input**: Text, email, password, textarea
- **Modal**: Generic modal, payment modal, confirmation modal
- **FileUploadDropZone** (NEW): Drag & drop, file picker, progress bar, validation results display
- **FileValidationStatus** (NEW): Real-time validation feedback with icons (✓ or ✗)

### Web – Pages
1. **Home** (`/`)
   - Hero section
   - CTA: "Order Custom Print" button
   - Search bar + filter sidebar
   - Product grid

2. **CustomOrderSubmission** (`/custom-orders/new`) (NEW - Phase 5)
   - Project description textarea
   - File upload component (drag & drop)
   - File validation results display
   - Form: color, material, quantity, special requirements
   - "Submit for Quote" button

3. **CustomOrderDetail** (`/custom-orders/:id`) (NEW - Phase 5)
   - Order status badge
   - File info (name, format, size, validation ✓)
   - Project description
   - Requested specs
   - Admin quote (once approved): cost + delivery date
   - "Confirm & Pay" button (if quote received)
   - Order timeline (submitted → validating → approved → in_production → completed)

4. **AdminCustomOrders** (`/admin/custom-orders`) (NEW - Phase 5)
   - Custom orders table/list
   - Filters: status, date range
   - Click row → full order details
   - Download button for file (secure)
   - Quote form: estimated_cost + delivery_date
   - Status dropdown

(All other pages from Phases 1-4 remain the same)

---

## Database Migrations (SQL)

```sql
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered');
CREATE TYPE custom_order_status AS ENUM ('submitted', 'validating', 'approved', 'in_production', 'completed');
CREATE TYPE email_status_type AS ENUM ('sent', 'failed', 'bounced');
CREATE TYPE file_format_type AS ENUM ('stl', '3dm', 'obj');
CREATE TYPE validation_status_type AS ENUM ('pending', 'validated', 'error');
CREATE TYPE virus_scan_status_type AS ENUM ('pending', 'clean', 'infected');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address JSONB,
  is_seller BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table (NEW - supports Phase 3 filtering)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  quantity_in_stock INTEGER DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_urls JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status order_status DEFAULT 'pending',
  total_price DECIMAL(10, 2) NOT NULL,
  razorpay_order_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_at_purchase DECIMAL(10, 2) NOT NULL
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory logs table (FIXED: quantity -> quantity_delta)
CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  action VARCHAR(50),
  quantity_delta INTEGER,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom Orders table (NEW - Phase 5)
CREATE TABLE custom_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status custom_order_status DEFAULT 'submitted',
  description TEXT,
  estimated_cost DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  razorpay_order_id VARCHAR(255),
  delivery_date_estimate TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom Order Files table (NEW - Phase 5)
CREATE TABLE custom_order_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custom_order_id UUID NOT NULL REFERENCES custom_orders(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  file_format VARCHAR(10),
  file_size_bytes INTEGER,
  file_url TEXT,
  validation_status validation_status_type DEFAULT 'pending',
  validation_errors JSONB,
  virus_scan_status virus_scan_status_type DEFAULT 'pending',
  virus_scan_result JSONB,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email logs table (NEW - audit trail for debugging)
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  status email_status_type DEFAULT 'sent',
  error_message TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  custom_order_id UUID REFERENCES custom_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance (FIXED: added missing indexes)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX idx_custom_orders_user_id ON custom_orders(user_id);
CREATE INDEX idx_custom_orders_status ON custom_orders(status);
CREATE INDEX idx_custom_order_files_custom_order_id ON custom_order_files(custom_order_id);
CREATE INDEX idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_order_id ON email_logs(order_id);
CREATE INDEX idx_email_logs_custom_order_id ON email_logs(custom_order_id);
```

### Migration Versioning Strategy
Migrations are numbered SQL files in `backend/migrations/` and run in order by the setup script. The convention is:

```
backend/migrations/
├── 001-initial-schema.sql     (all tables, enums, indexes)
├── 002-add-categories.sql     (if schema changes needed post-launch)
└── 003-custom-orders.sql      (Phase 5 tables)
```

- **Never edit an already-applied migration** — always create a new numbered file
- The `setup-db.js` script tracks which migrations have run using a `schema_migrations` table
- To add a new migration: create `00N-description.sql`, run `npm run migrate`
- Rollback: write a corresponding `00N-description-rollback.sql` and run manually if needed

---

## API Endpoint Summary

### Authentication
- `POST /api/auth/register` — Create new user
- `POST /api/auth/login` — Login, return JWT
- `POST /api/auth/logout` — Clear frontend token
- `GET /api/auth/google` — Redirect to Google OAuth consent screen
- `GET /api/auth/google/callback` — Handle Google OAuth callback, issue JWT
- `GET /api/auth/facebook` — Redirect to Facebook OAuth consent screen
- `GET /api/auth/facebook/callback` — Handle Facebook OAuth callback, issue JWT

### Products
- `GET /api/products` — List all products (with filters)
- `GET /api/products/:id` — Get product detail + reviews
- `POST /api/products` — Owner-only: create product
- `PUT /api/products/:id` — Owner-only: update product
- `DELETE /api/products/:id` — Owner-only: delete product

### Orders
- `GET /api/orders` — User's orders
- `GET /api/orders/:id` — User's order detail
- `POST /api/orders` — Create order from cart
- `GET /api/admin/orders` — Owner-only: all orders
- `PUT /api/admin/orders/:id/status` — Owner-only: update order status

### Reviews
- `GET /api/reviews?product_id=X` — Get reviews for product
- `POST /api/reviews` — User creates review

### Admin
- `GET /api/admin/dashboard` — Sales summary
- `GET /api/admin/inventory` — All products + stock
- `GET /api/admin/inventory-logs` — Inventory history
- `POST /api/admin/restock` — Add stock to product

### Custom Orders (NEW - Phase 5)
- `POST /api/custom-orders/upload` — Step 1: upload file (multipart), returns fileId + starts async validation
- `POST /api/custom-orders` — Step 2: create order with validated fileId
- `GET /api/custom-orders` — User's custom orders
- `GET /api/custom-orders/:id` — Custom order detail
- `POST /api/custom-orders/:id/files/:fileId/download` — Admin downloads file securely
- `PUT /api/custom-orders/:id/quote` — Admin approves & sets price + delivery date
- `PUT /api/custom-orders/:id/status` — Admin updates status
- `GET /api/admin/custom-orders` — Owner-only: all custom orders
- `GET /api/custom-orders/:id/validation-status` — Poll file validation progress (after Step 1)

### Webhooks
- `POST /webhooks/razorpay` — Razorpay payment callback

---

## Email Notification System

### Overview
Email notifications are sent to users at key order & custom order milestones to keep them informed. All emails are sent asynchronously via **Bull + Redis** (chosen queue for this project) to avoid blocking requests. Nodemailer is used for MVP; swap to SendGrid for production by changing `EMAIL_PROVIDER` in `.env`.

### Email Templates (Handlebars or EJS)

#### 1. Order Confirmation Email (Phase 1)
**Trigger**: When order is created and payment is confirmed (Razorpay webhook)
**Recipients**: User email
**Subject**: "Order Confirmation - Order #[ORDER_ID]"
**Content**:
- Thank you message
- Order ID & date
- Items list (product name, quantity, price each)
- Shipping address
- Total price
- Estimated delivery date (e.g., "Estimated delivery: 3-5 business days")
- Link to track order: "View Your Order"

#### 2. Order Status Update Email (Phase 2)
**Trigger**: When admin updates order status (paid → shipped → delivered)
**Recipients**: User email
**Subject**: "Your Order Has Been [SHIPPED/DELIVERED] - Order #[ORDER_ID]"
**Content for "Shipped"**:
- "Your order #[ID] has been shipped!"
- Items shipped
- Tracking info (if available)
- Expected delivery date
- Link to track order

**Content for "Delivered"**:
- "Your order #[ID] has been delivered!"
- Encourage user to leave a review
- Link to leave reviews
- Link to order detail

#### 3. Custom Order Received Email (Phase 5)
**Trigger**: When user submits custom order
**Recipients**: User email
**Subject**: "Custom Order Received - Order #[CUSTOM_ORDER_ID]"
**Content**:
- Thank you for submitting your custom order
- Order ID & submission date
- File name(s) & format
- Project description preview
- Requested specs (color, material, quantity)
- "We'll review your design and send you a quote within 24-48 hours"
- Link to view custom order

#### 4. Custom Order Quote Ready Email (Phase 5)
**Trigger**: When admin approves & sets quote + delivery date
**Recipients**: User email
**Subject**: "Your Custom Order Quote is Ready! - Order #[CUSTOM_ORDER_ID]"
**Content**:
- "Your custom order quote is ready!"
- Estimated cost: $X
- Estimated delivery date: [DATE]
- Project description & specs recap
- Action: "Review & Approve Quote" button → link to payment
- Link to custom order detail

#### 5. Custom Order Quote Confirmed Email (Phase 5)
**Trigger**: When user pays for custom order (Razorpay webhook)
**Recipients**: User email
**Subject**: "Custom Order Quote Approved & Payment Received - Order #[CUSTOM_ORDER_ID]"
**Content**:
- Payment confirmed
- Order ID & amount paid
- Next steps: "We're starting production on your custom design!"
- Expected delivery date
- Link to track order

#### 6. Custom Order In Production Email (Phase 5)
**Trigger**: When admin updates status to "in_production"
**Recipients**: User email
**Subject**: "Your Custom Order Is In Production - Order #[CUSTOM_ORDER_ID]"
**Content**:
- "We've started printing your custom design!"
- Order specs recap
- "Your order will be ready by [DATE]"
- Link to track order

#### 7. Custom Order Completed Email (Phase 5)
**Trigger**: When admin updates status to "completed"
**Recipients**: User email
**Subject**: "Your Custom Order Is Complete! - Order #[CUSTOM_ORDER_ID]"
**Content**:
- "Your custom order is complete and ready for shipment!"
- Order specs recap
- "It's on its way to you!"
- Link to track order

### Backend Email Service Architecture

#### Files to Create

**`backend/src/services/emailService.js`**
- Email service wrapper (SendGrid, Nodemailer, or AWS SES)
- Methods:
  - `sendOrderConfirmation(orderID, userEmail, orderData)`
  - `sendOrderStatusUpdate(orderID, userEmail, status, orderData)`
  - `sendCustomOrderReceived(customOrderID, userEmail, customOrderData)`
  - `sendCustomOrderQuote(customOrderID, userEmail, quoteData)`
  - `sendCustomOrderConfirmed(customOrderID, userEmail, paymentData)`
  - `sendCustomOrderInProduction(customOrderID, userEmail, customOrderData)`
  - `sendCustomOrderCompleted(customOrderID, userEmail, customOrderData)`

**`backend/src/services/emailQueue.js`**
- Job queue service (Bull with Redis or Agenda with MongoDB)
- Methods:
  - `enqueueEmail(templateName, templateData, userEmail)`
  - `processEmailQueue()` (runs as background job)
- Benefits: Async processing, retries on failure, rate limiting

**`backend/src/templates/emails/`**
- Create `.hbs` or `.ejs` files for each email template:
  - `orderConfirmation.hbs`
  - `orderStatusUpdate.hbs`
  - `customOrderReceived.hbs`
  - `customOrderQuote.hbs`
  - `customOrderConfirmed.hbs`
  - `customOrderInProduction.hbs`
  - `customOrderCompleted.hbs`

**`backend/src/controllers/orderController.js` (updated)**
- Add email queue integration:
  - After Razorpay webhook confirms payment → enqueue order confirmation email
  - When admin updates status → enqueue status update email

**`backend/src/controllers/customOrderController.js` (updated, Phase 5)**
- After custom order created → enqueue "received" email
- After quote approved → enqueue "quote ready" email
- After payment confirmed → enqueue "confirmed" email
- On status updates → enqueue appropriate email

### Configuration

**Email Provider Options**:

1. **SendGrid** (Recommended for production)
   - Free tier: 100 emails/day
   - Paid: Starting ~$10/month
   - Setup: Add API key to `.env`, use `@sendgrid/mail` npm package

2. **Nodemailer** (Self-hosted SMTP)
   - Free (uses your own SMTP, e.g., Gmail, Outlook)
   - Simple setup, good for MVP
   - Limitations: May have rate limiting on free email services

3. **AWS SES** (Scalable)
   - Free tier: 62,000 emails/month
   - Good for high volume

**Queue Options**:

1. **Bull + Redis** ✅ **CHOSEN for this project**
   - Fast, in-memory job processing
   - Reliable delivery & retries
   - Requires Redis server (add `redis` service to `docker-compose.yml`)

2. **Agenda + MongoDB** (not used — would require adding MongoDB as an extra dependency)

### Implementation Priority

**Phase 1 (MVP)**:
- [ ] Email service setup (SendGrid or Nodemailer)
- [ ] Order confirmation email only
- [ ] Basic template

**Phase 2**:
- [ ] Order status update emails (shipped, delivered)
- [ ] Email queue setup (Bull + Redis or Agenda)

**Phase 5**:
- [ ] Custom order emails (received, quote, confirmed, production, completed)
- [ ] Enhanced templates with styling

---

## Environment Variables (.env)

```
# Backend
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_3d
JWT_SECRET=your_secret_key_here   # Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Social Auth (OAuth 2.0) — Phase 1
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/facebook/callback

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret   # Set in Razorpay dashboard → Webhooks
FRONTEND_URL=http://localhost:3000

# Email Service
EMAIL_PROVIDER=sendgrid # or nodemailer, aws-ses
SENDGRID_API_KEY=your_sendgrid_api_key
OR
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
OR
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY=your_access_key
AWS_SES_SECRET_KEY=your_secret_key

EMAIL_FROM=noreply@your-store.com
EMAIL_FROM_NAME=Your 3D Store

# Email Queue (Bull + Redis — required from Phase 2 onwards)
REDIS_URL=redis://localhost:6379   # Use redis://redis:6379 when running in Docker

# File Upload & Storage (Phase 5)
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
OR
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Virus Scanning (Phase 5)
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
OR
VIRUSTOTAL_API_KEY=your_virustotal_api_key

# File Upload Limits
MAX_FILE_SIZE_MB=100
ALLOWED_FILE_FORMATS=stl,3dm,obj

# Web (React)
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key_id

# Mobile (React Native)
EXPO_PUBLIC_API_BASE_URL=http://your_backend_url/api
EXPO_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

---

## Verification Checklist

### Phase 1 Verification
- [ ] Backend server starts without errors
- [ ] Can create user account & login
- [ ] Can create & view products
- [ ] Can add products to cart
- [ ] Checkout & payment flow works
- [ ] Orders created & webhook updates status
- [ ] Admin can view orders
- [ ] User receives order confirmation email with order ID, items, and total

### Phase 2 Verification
- [ ] Stock decrements on purchase
- [ ] Admin can update order status
- [ ] User sees order history & status
- [ ] Inventory logs recorded
- [ ] User receives email when order status changes (shipped, delivered)

### Phase 3 Verification
- [ ] Search & filtering work
- [ ] Reviews display & rating updates
- [ ] Responsive design at all breakpoints
- [ ] Form validation & error messages

### Phase 4 Verification (Mobile)
- [ ] App runs on emulator/simulator
- [ ] All screens navigate correctly
- [ ] Features work on mobile
- [ ] Build APK/IPA successfully

### Phase 5 Verification (Custom Orders - NEW)
- [ ] **File Upload**: User can upload STL, 3DM, OBJ files
- [ ] **Format Validation**: Accepts .stl/.3dm/.obj, rejects other formats
- [ ] **Magic Byte Checking**: Rejects renamed files (e.g., .stl as .txt)
- [ ] **Corrupted Files**: Displays error "File appears corrupted"
- [ ] **File Size**: Rejects files >100MB with clear error
- [ ] **Virus Scan**: Passes clean files ✓, blocks infected files with error
- [ ] **EICAR Test**: Infected file (test virus) is properly detected & rejected
- [ ] **Validation Status**: Real-time UI shows progress (pending → pass/fail)
- [ ] **Admin Download**: Admin can download file securely (signed URL)
- [ ] **Public Security**: User cannot access other users' uploaded files
- [ ] **Quote Workflow**: Admin can set quote & delivery date
- [ ] **Order Payment**: User can pay for custom order via Razorpay
- [ ] **Status Tracking**: Custom order status updates (submitted → in_production → completed)
- [ ] **File Auto-Delete**: Files removed 30 days after order completion
- [ ] **Email Notifications**: User receives email at each stage (received, quote ready, payment confirmed, in production, completed)

---

## Tech Stack Recommendation

| Component | Recommendation | Reasoning |
|-----------|---------------|-----------|
| **Backend Framework** | Express.js | Lightweight, well-documented |
| **Database** | PostgreSQL | Reliable, ACID compliance |
| **ORM/Query Builder** | Sequelize or Knex.js | Easier DB interactions |
| **Authentication** | JWT | Stateless, works for web & mobile |
| **Social Auth** | Passport.js + Google/Facebook strategies | Industry standard OAuth 2.0 |
| **Password Hashing** | bcrypt | Industry standard |
| **Web Framework** | React | Largest ecosystem |
| **Web UI Library** | Shadcn UI or Material-UI | Pre-built components |
| **Web Styling** | Tailwind CSS | Utility-first, responsive |
| **Mobile Framework** | React Native (Expo) | Code reuse |
| **API Client** | Axios | Promise-based, interceptors |
| **Payment Gateway** | Razorpay | Best UPI support for India |
| **Image Hosting** | Cloudinary | Auto-optimization, CDN || **Email Service** | SendGrid, Nodemailer, or AWS SES | Reliable email delivery |
| **Email Queue** | Bull (Redis) or Agenda (MongoDB) | Async job processing |
| **Email Templating** | Handlebars or EJS | Template rendering || **File Storage (Phase 5)** | AWS S3 or Cloudinary | Secure, scalable |
| **Virus Scanning (Phase 5)** | ClamAV (self-hosted) or VirusTotal API | Security, open-source option |
| **File Validation (Phase 5)** | file-type npm library | Magic byte detection |
| **Database Hosting** | Supabase or Railway | Managed PostgreSQL |
| **Backend Hosting** | Railway or Render | Free tier, easy deployment |
| **Web Hosting** | Vercel | Optimized for React |
| **Testing** | Jest + React Testing Library | Industry standard |

---

## Scope: Included ✅ vs. Excluded ❌

### Included in MVP (Phases 1-5)
- Single seller model
- Product images
- UPI payments (Razorpay)
- Search & filtering
- Review/rating system
- Order tracking
- JWT authentication
- **Social login: Google & Facebook OAuth** (Phase 1)
- Responsive web + React Native mobile
- Inventory management
- **Email notifications** (order confirmation, status updates)
- Custom 3D printing orders (Phase 5)
- File validation (STL, 3DM, OBJ)
- Virus scanning (ClamAV/VirusTotal)
- Secure file storage (S3/Cloudinary)
- Quote workflow (admin → user)
- Production status tracking

### Out of Scope (v2+)
- Advanced analytics (revenue charts, trends)
- Shipping integration (3rd-party APIs)
- Wishlist/favorites
- Product recommendations
- Two-factor authentication
- Live chat support
- Subscription/recurring orders
- Product variants (colors, sizes)
- Multi-seller marketplace
- 3D model preview/rendering
- SMS notifications

---

## Rough Timeline

- **Week 1**: Backend setup + Core API + React pages + Email setup (Phase 1)
- **Week 2**: Inventory, order management, email notifications (Phase 2) + Admin pages
- **Week 2-3** (Parallel): Search, reviews, polish (Phase 3) + React Native (Phase 4)
- **Week 3-4**: Polish, testing, mobile deployment (Phase 4 completion)
- **Week 4-5** (Parallel): Custom 3D orders with file validation + virus scanning + custom order emails (Phase 5)

**MVP Launch Target**: 5 weeks (Phases 1-5 complete)
*Email notifications integrated throughout all phases*

---

## Critical Implementation Notes

### Phase 5 Security - MUST DO
1. **Never trust file extensions**: Always verify magic bytes (binary signature)
2. **Always scan for viruses**: No exception — use ClamAV or VirusTotal
3. **Secure file storage**: Private S3/Cloudinary, never on server disk
4. **Signed URLs**: Time-limited access for admin downloads
5. **User isolation**: Ensure users cannot access other users' files
6. **Input validation**: File name sanitization, no path traversal
7. **Rate limiting**: Prevent upload spam/DoS attacks on file validation
8. **Audit logs**: Track all file uploads, validations, downloads by admin

### Order Status State Machine

**Standard Orders**: pending → paid → shipped → delivered
**Custom Orders**: submitted → validating → approved → in_production → completed (or cancelled)

### Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| Unit | Jest | Services (fileValidator, virusScanner, emailService), utility functions, validators |
| Integration | Jest + Supertest | API endpoints with a real test DB (separate `ecommerce_3d_test` database) |
| Frontend | React Testing Library | Component rendering, form validation, cart logic |
| E2E | Playwright or Cypress | Full user flows: register → buy → checkout; admin: login → update order status |
| File Validation | Jest | Test with valid STL/3DM/OBJ, corrupted files, renamed files, EICAR test file |

**Coverage target**: 80% for backend services and controllers. Frontend components: critical paths only (auth, cart, checkout).

Run tests with:
```bash
# Backend
cd backend && npm test              # Jest, single run
cd backend && npm run test:watch    # Watch mode during development

# Frontend
cd web && npm test -- --watchAll=false   # Single run (CI)
```

### Custom Order Cancellation (MVP Decision)
Cancellation is **not supported in the MVP**. If a user wants to cancel, they must contact the store owner directly. The UI should:
- Not show a "Cancel" button on custom orders
- Show a note: "To cancel your order, please contact us at [email]"
- The `custom_order_status` enum intentionally has no `cancelled` value in MVP

This can be added in v2 with a proper cancellation + refund workflow.

---

## Next Steps for Refinement

1. **Choose Hosting**: PostgreSQL (Supabase vs. Railway), backend (Railway vs. Render), S3 vs. Cloudinary
2. **API Contract**: Define exact request/response formats (use OpenAPI/Swagger)
3. **Database Finalization**: Review migrations, add indexes
4. **UI/UX Design**: Wireframes for all pages (especially custom order flow & validation UI)
5. **Payment Flow**: Map out Razorpay webhooks for both standard & custom orders
6. **Security Checklist**: CORS, rate limiting, input validation, secrets management
7. **File Validation Test Suite**: Test with valid/corrupted/infected files
8. **Testing Strategy**: Unit tests, integration tests, E2E tests
9. **Deployment**: GitHub Actions CI/CD, database migrations, environment setup
