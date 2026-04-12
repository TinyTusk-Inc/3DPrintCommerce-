# Backend Models Documentation

## Overview

The application uses 9 data models that interact with the PostgreSQL database. Each model is a class with static methods for database operations (CRUD + custom queries). Models use the connection pool from `backend/src/config/database.js` for safe, efficient database access.

## Architecture

**Design Pattern**: Static class methods for query abstraction
- No ORM dependencies (using raw queries for flexibility)
- Connection pooling handled by database config
- Automatic error handling and validation
- JSON serialization for complex data types

**Import Structure**:
```javascript
// Option 1: Import all models
const { User, Product, Order } = require('../models');

// Option 2: Import specific model
const User = require('../models/User');

// Option 3: Import from index
const Models = require('../models');
const user = Models.User;
```

---

## 1. User Model

Handles user authentication, profiles, and admin operations.

**Location**: `backend/src/models/User.js`

### Methods

#### `User.create(email, passwordHash, name, phone)`
Creates a new user (registration).
```javascript
const user = await User.create(
  'user@example.com',
  hashedPassword, // bcrypt hash
  'John Doe',
  '+1234567890'
);
// Returns: { id, email, name, phone, is_seller, is_admin, created_at }
```

#### `User.findByEmail(email)`
Find user by email (used for login).
```javascript
const user = await User.findByEmail('user@example.com');
// Returns: { id, email, password_hash, name, phone, is_seller, is_admin, created_at, updated_at }
// Returns: null if not found
```

#### `User.findById(userId)`
Get user profile by ID.
```javascript
const user = await User.findById(userId);
// Returns: { id, email, name, phone, address, is_seller, is_admin, created_at, updated_at }
```

#### `User.updateProfile(userId, data)`
Update user profile information.
```javascript
const updated = await User.updateProfile(userId, {
  name: 'Jane Doe',
  phone: '+9876543210',
  address: { street: '123 Main St', city: 'Anytown', zip: '12345' }
});
// address is automatically JSON serialized/deserialized
```

#### `User.listAll(limit, offset)`
List all users with pagination (admin only).
```javascript
const users = await User.listAll(50, 0); // first 50 users
// Returns: Array of user objects
```

#### `User.count()`
Get total user count.
```javascript
const total = await User.count();
// Returns: number
```

#### `User.updateRoles(userId, isSeller, isAdmin)`
Update user roles (admin only).
```javascript
const updated = await User.updateRoles(userId, true, false); // Make seller, not admin
// Returns: { id, email, is_seller, is_admin, updated_at }
```

---

## 2. Category Model

Manages product categories.

**Location**: `backend/src/models/Category.js`

### Methods

#### `Category.create(name, description)`
Create a new category.
```javascript
const category = await Category.create(
  '3D Printing Supplies',
  'Filament, resins, and accessories'
);
```

#### `Category.findById(categoryId)`
Get category by ID.
```javascript
const category = await Category.findById(categoryId);
```

#### `Category.findByName(name)`
Get category by name.
```javascript
const category = await Category.findByName('3D Printing Supplies');
```

#### `Category.listAll()`
List all categories.
```javascript
const categories = await Category.listAll();
// Returns: Array of categories
```

#### `Category.update(categoryId, data)`
Update category.
```javascript
const updated = await Category.update(categoryId, {
  name: 'New Name',
  description: 'New description'
});
```

#### `Category.delete(categoryId)`
Delete a category.
```javascript
const success = await Category.delete(categoryId);
// Returns: boolean
```

#### `Category.countProducts(categoryId)`
Count products in category.
```javascript
const count = await Category.countProducts(categoryId);
```

---

## 3. Product Model

Handles product listings and inventory.

**Location**: `backend/src/models/Product.js`

### Methods

#### `Product.create(data)`
Create a new product.
```javascript
const product = await Product.create({
  seller_id: 'uuid',
  name: 'PLA Filament Red',
  description: 'Premium quality red PLA filament',
  price: 25.99,
  quantity_in_stock: 100,
  category_id: 'uuid',
  image_urls: ['https://...jpg', 'https://...jpg']
});
```

#### `Product.findById(productId)`
Get product details.
```javascript
const product = await Product.findById(productId);
// image_urls is automatically parsed from JSON
```

#### `Product.listAll(limit, offset)`
List products with pagination.
```javascript
const products = await Product.listAll(50, 0);
```

#### `Product.listByCategory(categoryId, limit, offset)`
List products by category.
```javascript
const products = await Product.listByCategory(categoryId, 50, 0);
```

#### `Product.search(searchTerm, limit, offset)`
Search products by name or description (case-insensitive).
```javascript
const results = await Product.search('filament', 50, 0);
```

#### `Product.update(productId, data)`
Update product information.
```javascript
const updated = await Product.update(productId, {
  name: 'New Name',
  price: 29.99,
  quantity_in_stock: 120,
  image_urls: ['https://...jpg']
});
```

#### `Product.delete(productId)`
Delete a product.
```javascript
const success = await Product.delete(productId);
```

#### `Product.count()`
Count total products.
```javascript
const total = await Product.count();
```

#### `Product.getLowStock(threshold)`
Get products below stock threshold.
```javascript
const lowStock = await Product.getLowStock(10);
// Returns: [{ id, name, quantity_in_stock, price }, ...]
```

---

## 4. Order Model

Manages customer orders.

**Location**: `backend/src/models/Order.js`

### Methods

#### `Order.create(data)`
Create a new order.
```javascript
const order = await Order.create({
  user_id: 'uuid',
  seller_id: 'uuid',
  status: 'pending', // or 'paid', 'shipped', 'delivered', 'cancelled'
  total_price: 99.99,
  razorpay_order_id: 'order_xxxxx',
  shipping_address: {
    street: '123 Main St',
    city: 'New York',
    zip: '10001',
    phone: '+1234567890'
  }
});
```

#### `Order.findById(orderId)`
Get order details.
```javascript
const order = await Order.findById(orderId);
// shipping_address is automatically parsed
```

#### `Order.findByRazorpayOrderId(razorpayOrderId)`
Find order by payment gateway ID (useful for webhook handling).
```javascript
const order = await Order.findByRazorpayOrderId('order_xxxxx');
```

#### `Order.listByUser(userId, limit, offset)`
List user's orders.
```javascript
const orders = await Order.listByUser(userId, 50, 0);
```

#### `Order.listAll(limit, offset)`
List all orders (admin).
```javascript
const orders = await Order.listAll(50, 0);
```

#### `Order.listByStatus(status, limit, offset)`
List orders by status.
```javascript
const paidOrders = await Order.listByStatus('paid', 50, 0);
```

#### `Order.updateStatus(orderId, newStatus)`
Update order status.
```javascript
const updated = await Order.updateStatus(orderId, 'shipped');
```

#### `Order.updatePaymentInfo(orderId, razorpayPaymentId)`
Update payment after successful payment (called from webhook).
```javascript
const updated = await Order.updatePaymentInfo(orderId, 'pay_xxxxx');
// Automatically sets status to 'paid'
```

#### `Order.count()`
Count total orders.
```javascript
const total = await Order.count();
```

#### `Order.getByDateRange(startDate, endDate)`
Get orders for a date range (reporting).
```javascript
const orders = await Order.getByDateRange(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

---

## 5. OrderItem Model

Individual items in orders.

**Location**: `backend/src/models/OrderItem.js`

### Methods

#### `OrderItem.create(data)`
Add item to order.
```javascript
const item = await OrderItem.create({
  order_id: 'uuid',
  product_id: 'uuid',
  quantity: 5,
  price_at_purchase: 25.99
});
```

#### `OrderItem.findById(orderItemId)`
Get order item details.
```javascript
const item = await OrderItem.findById(orderItemId);
```

#### `OrderItem.listByOrder(orderId)`
Get all items in an order with product details.
```javascript
const items = await OrderItem.listByOrder(orderId);
// Returns: { id, product_id, quantity, price_at_purchase, product_name, image_urls, ... }
```

#### `OrderItem.getTotalSold(productId)`
Get total quantity sold for a product.
```javascript
const totalSold = await OrderItem.getTotalSold(productId);
```

#### `OrderItem.getRevenue(productId)`
Calculate total revenue for a product.
```javascript
const revenue = await OrderItem.getRevenue(productId);
```

#### `OrderItem.delete(orderItemId)`
Remove item from order.
```javascript
const success = await OrderItem.delete(orderItemId);
```

#### `OrderItem.countByOrder(orderId)`
Count items in an order.
```javascript
const count = await OrderItem.countByOrder(orderId);
```

---

## 6. Review Model

Product reviews and ratings.

**Location**: `backend/src/models/Review.js`

### Methods

#### `Review.create(data)`
Create a product review.
```javascript
const review = await Review.create({
  product_id: 'uuid',
  user_id: 'uuid',
  rating: 4, // 1-5
  text: 'Great quality filament!'
});
```

#### `Review.findById(reviewId)`
Get review with author details.
```javascript
const review = await Review.findById(reviewId);
// Returns: { ..., author_name, author_email }
```

#### `Review.listByProduct(productId, limit, offset)`
Get reviews for a product.
```javascript
const reviews = await Review.listByProduct(productId, 50, 0);
```

#### `Review.listByUser(userId, limit, offset)`
Get reviews written by a user.
```javascript
const reviews = await Review.listByUser(userId, 50, 0);
```

#### `Review.update(reviewId, data)`
Update a review.
```javascript
const updated = await Review.update(reviewId, {
  rating: 5,
  text: 'Changed my mind, excellent product!'
});
```

#### `Review.delete(reviewId)`
Delete a review.
```javascript
const success = await Review.delete(reviewId);
```

#### `Review.getStats(productId)`
Get rating statistics for a product.
```javascript
const stats = await Review.getStats(productId);
// Returns: { average_rating: 4.5, review_count: 12 }
```

#### `Review.countByProduct(productId)`
Count reviews for a product.
```javascript
const count = await Review.countByProduct(productId);
```

#### `Review.findUserReview(productId, userId)`
Check if user already reviewed product.
```javascript
const existingReview = await Review.findUserReview(productId, userId);
```

---

## 7. InventoryLog Model

Audit trail for inventory changes.

**Location**: `backend/src/models/InventoryLog.js`

### Methods

#### `InventoryLog.create(data)`
Log an inventory change.
```javascript
const log = await InventoryLog.create({
  product_id: 'uuid',
  action: 'add', // or 'remove', 'sold'
  quantity_delta: 50,
  reason: 'Restock from supplier'
});
```

#### `InventoryLog.findById(logId)`
Get a log entry.
```javascript
const log = await InventoryLog.findById(logId);
```

#### `InventoryLog.listByProduct(productId, limit, offset)`
Get inventory history for a product.
```javascript
const logs = await InventoryLog.listByProduct(productId, 100, 0);
```

#### `InventoryLog.listByAction(action, limit, offset)`
Get logs by action type.
```javascript
const adds = await InventoryLog.listByAction('add', 100, 0);
const removals = await InventoryLog.listByAction('remove', 100, 0);
const sales = await InventoryLog.listByAction('sold', 100, 0);
```

#### `InventoryLog.getByDateRange(startDate, endDate)`
Get logs for date range.
```javascript
const logs = await InventoryLog.getByDateRange(startDate, endDate);
```

#### `InventoryLog.getTotalChange(productId)`
Get cumulative inventory change.
```javascript
const netChange = await InventoryLog.getTotalChange(productId);
```

#### `InventoryLog.countByProduct(productId)`
Count log entries for product.
```javascript
const count = await InventoryLog.countByProduct(productId);
```

#### `InventoryLog.getSummary(productId)`
Get inventory summary.
```javascript
const summary = await InventoryLog.getSummary(productId);
// Returns: { add: 500, remove: 100, sold: 200, add_count: 5, remove_count: 2, sold_count: 10 }
```

---

## 8. CustomOrder Model

Custom 3D printing orders (Phase 5).

**Location**: `backend/src/models/CustomOrder.js`

### Methods

#### `CustomOrder.create(data)`
Create a custom order request.
```javascript
const order = await CustomOrder.create({
  user_id: 'uuid',
  seller_id: 'uuid',
  description: 'Custom figurine of my pet',
  specifications: {
    dimensions: '10cm x 10cm x 15cm',
    material: 'PLA',
    color: 'blue',
    complexity: 'high'
  },
  status: 'submitted', // default
  estimated_cost: 50.00,
  files_urls: ['https://s3.../model.stl']
});
```

#### `CustomOrder.findById(customOrderId)`
Get custom order details.
```javascript
const order = await CustomOrder.findById(customOrderId);
// specifications and files_urls are auto-parsed
```

#### `CustomOrder.listByUser(userId, limit, offset)`
List user's custom orders.
```javascript
const orders = await CustomOrder.listByUser(userId, 50, 0);
```

#### `CustomOrder.listBySeller(sellerId, limit, offset)`
List custom orders for a seller.
```javascript
const orders = await CustomOrder.listBySeller(sellerId, 50, 0);
```

#### `CustomOrder.listByStatus(status, limit, offset)`
List orders by status.
```javascript
// Statuses: submitted, in_progress, quote_sent, accepted, rejected, completed
const pending = await CustomOrder.listByStatus('submitted', 50, 0);
```

#### `CustomOrder.update(customOrderId, data)`
Update order details.
```javascript
const updated = await CustomOrder.update(customOrderId, {
  status: 'in_progress',
  specifications: { /* updated specs */ },
  estimated_cost: 60.00
});
```

#### `CustomOrder.updateStatus(customOrderId, newStatus, estimatedCost)`
Update status with optional cost update.
```javascript
const updated = await CustomOrder.updateStatus(
  customOrderId,
  'quote_sent',
  75.00
);
```

#### `CustomOrder.count()`
Total custom orders.
```javascript
const total = await CustomOrder.count();
```

#### `CustomOrder.countPending()`
Count pending orders.
```javascript
const pending = await CustomOrder.countPending();
// Counts 'submitted' and 'in_progress' statuses
```

---

## 9. CustomOrderFile Model

Files uploaded for custom orders (Phase 5).

**Location**: `backend/src/models/CustomOrderFile.js`

### Methods

#### `CustomOrderFile.create(data)`
Add file to custom order.
```javascript
const file = await CustomOrderFile.create({
  custom_order_id: 'uuid',
  file_name: 'model.stl',
  file_url: 'https://s3.../uploads/model.stl',
  file_type: 'model/stl',
  file_size: 2048576, // bytes
  virus_scanned: false
});
```

#### `CustomOrderFile.findById(fileId)`
Get file details.
```javascript
const file = await CustomOrderFile.findById(fileId);
```

#### `CustomOrderFile.listByCustomOrder(customOrderId)`
List files for an order.
```javascript
const files = await CustomOrderFile.listByCustomOrder(customOrderId);
```

#### `CustomOrderFile.update(fileId, data)`
Update file (mainly virus_scanned status).
```javascript
const updated = await CustomOrderFile.update(fileId, {
  virus_scanned: true
});
```

#### `CustomOrderFile.delete(fileId)`
Delete file record.
```javascript
const success = await CustomOrderFile.delete(fileId);
```

#### `CustomOrderFile.countByCustomOrder(customOrderId)`
Count files in order.
```javascript
const count = await CustomOrderFile.countByCustomOrder(customOrderId);
```

#### `CustomOrderFile.getTotalSize(customOrderId)`
Get total file size.
```javascript
const totalSize = await CustomOrderFile.getTotalSize(customOrderId);
// Returns: total bytes
```

#### `CustomOrderFile.getUnscanned()`
Get all files awaiting virus scan.
```javascript
const unscanned = await CustomOrderFile.getUnscanned();
// Use for virus scan workflow
```

#### `CustomOrderFile.markScanned(fileIds)`
Mark multiple files as scanned.
```javascript
const count = await CustomOrderFile.markScanned([
  'file-id-1',
  'file-id-2'
]);
```

---

## Usage Examples

### Complete Registration Flow
```javascript
const { User } = require('../models');
const bcrypt = require('bcrypt');

async function registerUser(email, password, name, phone) {
  // Check if user exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) throw new Error('Email already registered');

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create(email, passwordHash, name, phone);
  
  return { id: user.id, email: user.email, name: user.name };
}
```

### Create Order with Items
```javascript
const { Order, OrderItem, Product } = require('../models');

async function createOrder(userId, sellerId, cartItems, shippingAddress) {
  let totalPrice = 0;

  // Calculate total
  for (const item of cartItems) {
    const product = await Product.findById(item.product_id);
    totalPrice += product.price * item.quantity;
  }

  // Create order
  const order = await Order.create({
    user_id: userId,
    seller_id: sellerId,
    total_price: totalPrice,
    shipping_address: shippingAddress,
    status: 'pending'
  });

  // Add items
  for (const item of cartItems) {
    const product = await Product.findById(item.product_id);
    await OrderItem.create({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: product.price
    });
  }

  return order;
}
```

### Update Inventory and Log
```javascript
const { InventoryLog, Product } = require('../models');

async function addStock(productId, quantity, reason) {
  // Log the change
  await InventoryLog.create({
    product_id: productId,
    action: 'add',
    quantity_delta: quantity,
    reason: reason
  });

  // Update product
  const product = await Product.findById(productId);
  await Product.update(productId, {
    quantity_in_stock: product.quantity_in_stock + quantity
  });
}
```

---

## Error Handling

Models throw errors for:
- Invalid input (e.g., rating not 1-5)
- Duplicate entries (unique constraint violations)
- Database connection issues
- Missing required fields

Controllers should catch and handle these errors appropriately:

```javascript
try {
  const user = await User.create(email, hash, name, phone);
} catch (error) {
  if (error.message === 'Email already exists') {
    return res.status(409).json({ error: 'Email already registered' });
  }
  return res.status(500).json({ error: 'Database error' });
}
```

---

## Next Steps

Models are now complete. Proceed to:
1. **Authentication Routes** - Create login/register endpoints using User model
2. **Product Routes** - Create product listing endpoints
3. **Order Routes** - Create order management endpoints
4. **Middleware** - Create JWT authentication middleware

See `BACKEND_SETUP.md` for integration with Express routes.
