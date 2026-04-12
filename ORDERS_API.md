# Orders API Documentation

## Overview

The Orders API provides complete ecommerce checkout and order management functionality including:
- Shopping cart checkout with payment processing
- Order creation with inventory validation
- Order tracking and status management
- Razorpay payment webhook handling
- Admin order management and statistics

---

## Authentication

Most endpoints require JWT authentication via `Authorization: Bearer <token>` header.

Webhook endpoint (`POST /api/orders/webhook/razorpay`) is public but includes Razorpay signature verification.

---

## Order Statuses

Orders progress through these statuses:

| Status | Description | Can Transition To |
|--------|-------------|-------------------|
| **pending** | Order created, awaiting payment | paid, cancelled |
| **paid** | Payment successful, order confirmed | shipped, cancelled |
| **shipped** | Order dispatched to customer | delivered |
| **delivered** | Order received by customer | (final state) |
| **cancelled** | Order cancelled by user or admin | (final state) |

---

## API Endpoints

### Public (Webhook)

#### POST /api/orders/webhook/razorpay
Handle Razorpay payment callbacks.

**No authentication required** (Razorpay signature verified)

**Razorpay sends webhook when:**
- Payment is authorized: `event: "payment.authorized"`
- Payment is captured: `event: "payment.captured"`
- Payment fails: `event: "payment.failed"`

**Webhook payload (Razorpay):**
```json
{
  "event": "payment.authorized",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xyz123",
        "order_id": "order_abc456",
        "amount": 5000,
        "status": "authorized"
      }
    }
  }
}
```

**Example Webhook Test (for local development):**
```bash
curl -X POST http://localhost:3000/api/orders/webhook/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: dummy-signature" \
  -d '{
    "event": "payment.authorized",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test123",
          "order_id": "order_test456",
          "amount": 5000,
          "status": "authorized"
        }
      }
    }
  }'
```

**Response (200):**
```json
{
  "message": "Payment processed successfully",
  "order": {
    "id": "uuid",
    "status": "paid",
    "razorpay_payment_id": "pay_test123",
    "updated_at": "2026-04-12T10:00:00Z"
  }
}
```

---

### Protected (Authentication Required)

#### POST /api/orders
Create new order from cart items. Validates inventory and processes payment workflow.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2
    },
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440001",
      "quantity": 1
    }
  ],
  "shipping_address": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-123-4567",
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "USA"
  }
}
```

**Field Validation:**
- `items` - Required, non-empty array
- `items[].product_id` - Valid UUID, product must exist
- `items[].quantity` - Integer ≥ 1, cannot exceed stock
- `shipping_address` - Required, all fields mandatory
- Order total must be > 0

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"product_id": "uuid-1", "quantity": 1},
      {"product_id": "uuid-2", "quantity": 2}
    ],
    "shipping_address": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-123-4567",
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102",
      "country": "USA"
    }
  }'
```

**Response (201 - Created):**
```json
{
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "razorpay_order_id": "order_1712975000000_abc123xyz",
    "status": "pending",
    "total_price": 125.50,
    "items": [
      {
        "id": "item-uuid-1",
        "order_id": "order-uuid",
        "product_id": "product-uuid-1",
        "quantity": 2,
        "price_at_purchase": 25.99,
        "created_at": "2026-04-12T10:00:00Z"
      }
    ],
    "shipping_address": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-123-4567",
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102",
      "country": "USA"
    },
    "created_at": "2026-04-12T10:00:00Z"
  },
  "message": "Order created. Proceed to payment."
}
```

**Error Responses:**
- `400` - Invalid items, insufficient stock, incomplete shipping address
- `401` - Missing or invalid token
- `404` - Product not found
- `500` - Server error

**Common Errors:**
```json
{
  "error": "Items array is required and cannot be empty"
}
```

```json
{
  "error": "Product 'uuid-1' only has 5 in stock, but 10 requested"
}
```

---

#### GET /api/orders
List authenticated user's orders with optional status filtering.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20, max: 50) - Orders per page
- `status` (optional) - Filter by status: `pending`, `paid`, `shipped`, `delivered`, `cancelled`

**Example Requests:**
```bash
# Get all orders (first 20)
curl http://localhost:3000/api/orders \
  -H "Authorization: Bearer your-jwt-token"

# Get page 2 with 10 items
curl "http://localhost:3000/api/orders?page=2&limit=10" \
  -H "Authorization: Bearer your-jwt-token"

# Get pending orders only
curl "http://localhost:3000/api/orders?status=pending" \
  -H "Authorization: Bearer your-jwt-token"

# Get delivered orders
curl "http://localhost:3000/api/orders?status=delivered" \
  -H "Authorization: Bearer your-jwt-token"
```

**Response (200):**
```json
{
  "orders": [
    {
      "id": "uuid",
      "user_id": "user-uuid",
      "seller_id": "seller-uuid",
      "status": "delivered",
      "total_price": 125.50,
      "razorpay_order_id": "order_xyz",
      "razorpay_payment_id": "pay_abc",
      "items": [
        {
          "id": "item-uuid",
          "product_id": "product-uuid",
          "quantity": 2,
          "price_at_purchase": 25.99,
          "product_name": "PLA Filament Red",
          "product_description": "Premium quality",
          "image_urls": ["https://...", "https://..."],
          "created_at": "2026-04-12T10:00:00Z"
        }
      ],
      "item_count": 1,
      "created_at": "2026-04-12T10:00:00Z",
      "updated_at": "2026-04-12T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

**Order States in Response:**
- `status` - Current order status
- `razorpay_payment_id` - Populated after successful payment (null if pending)
- `item_count` - Number of products in order
- `items` - Full product details for each line item

---

#### GET /api/orders/:id
Get detailed information about a specific order.

**Parameters:**
- `id` (required) - Order UUID

**Authorization:**
- Users can view their own orders
- Admins can view any order

**Example Request:**
```bash
curl http://localhost:3000/api/orders/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer your-jwt-token"
```

**Response (200):**
```json
{
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "seller_id": "seller-uuid",
    "status": "shipped",
    "total_price": 125.50,
    "razorpay_order_id": "order_xyz",
    "razorpay_payment_id": "pay_abc",
    "created_at": "2026-04-12T10:00:00Z",
    "updated_at": "2026-04-12T11:00:00Z",
    "item_count": 2,
    "shipping_address": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-123-4567",
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102",
      "country": "USA"
    },
    "items": [
      {
        "id": "item-uuid-1",
        "order_id": "order-uuid",
        "product_id": "product-uuid-1",
        "quantity": 2,
        "price_at_purchase": 25.99,
        "product_name": "PLA Filament Red",
        "product_description": "Premium quality red PLA filament",
        "image_urls": ["https://s3.amazon.com/bucket/product-1.jpg"],
        "created_at": "2026-04-12T10:00:00Z"
      },
      {
        "id": "item-uuid-2",
        "order_id": "order-uuid",
        "product_id": "product-uuid-2",
        "quantity": 1,
        "price_at_purchase": 35.99,
        "product_name": "ABS Filament Black",
        "product_description": "Professional grade ABS",
        "image_urls": ["https://s3.amazon.com/bucket/product-2.jpg"],
        "created_at": "2026-04-12T10:00:00Z"
      }
    ]
  }
}
```

**Error Responses:**
- `400` - Invalid order ID format
- `401` - Missing or invalid token
- `403` - Not authorized (user trying to view other user's order)
- `404` - Order not found
- `500` - Server error

---

#### POST /api/orders/:id/cancel
Cancel order. Users can cancel their own pending/paid orders, admins can cancel any order.

**Parameters:**
- `id` (required) - Order UUID

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Validation:**
- Order must exist
- Order must be in `pending` or `paid` status
- User must be order owner or admin

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/orders/550e8400-e29b-41d4-a716-446655440000/cancel \
  -H "Authorization: Bearer your-jwt-token"
```

**Response (200):**
```json
{
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "status": "cancelled",
    "total_price": 125.50,
    "razorpay_order_id": "order_xyz",
    "updated_at": "2026-04-12T10:05:00Z"
  },
  "message": "Order cancelled successfully"
}
```

**Error Responses:**
- `400` - Cannot cancel (order already shipped/delivered)
- `401` - Missing or invalid token
- `403` - Not authorized to cancel this order
- `404` - Order not found
- `500` - Server error

**Example Errors:**
```json
{
  "error": "Cannot cancel order with status: shipped"
}
```

---

### Admin Only Endpoints

#### PUT /api/orders/:id
Update order status. Admin only.

**Parameters:**
- `id` (required) - Order UUID

**Headers:**
```
Authorization: Bearer <jwt-token>  (admin user required)
```

**Request Body:**
```json
{
  "status": "shipped"
}
```

**Valid Status Transitions:**
```
pending → paid → shipped → delivered
Any status → cancelled
```

**Example Request:**
```bash
curl -X PUT http://localhost:3000/api/orders/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}'
```

**Response (200):**
```json
{
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "seller_id": "seller-uuid",
    "status": "shipped",
    "total_price": 125.50,
    "razorpay_order_id": "order_xyz",
    "updated_at": "2026-04-12T10:10:00Z"
  },
  "message": "Order status updated to shipped"
}
```

**Error Responses:**
- `400` - Invalid status or invalid transition
- `401` - Missing or invalid token
- `403` - User is not admin
- `404` - Order not found
- `500` - Server error

---

#### GET /api/orders/admin/stats
Get order statistics and revenue summary. Admin only.

**Headers:**
```
Authorization: Bearer <jwt-token>  (admin user required)
```

**Example Request:**
```bash
curl http://localhost:3000/api/orders/admin/stats \
  -H "Authorization: Bearer admin-jwt-token"
```

**Response (200):**
```json
{
  "stats": {
    "total_orders": 142,
    "by_status": {
      "pending": 5,
      "paid": 45,
      "shipped": 67,
      "delivered": 20,
      "cancelled": 5
    },
    "total_revenue": 45230.75,
    "average_order_value": 318.67
  }
}
```

**Calculation Details:**
- `total_orders` - Count of all orders
- `by_status` - Count of orders in each status
- `total_revenue` - Sum of delivered + shipped + paid orders
- `average_order_value` - total_revenue / count of completed orders

**Error Responses:**
- `401` - Missing or invalid token
- `403` - User is not admin
- `500` - Server error

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": "User-friendly error message",
  "message": "Technical details (development mode only)"
}
```

### Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Valid request processed |
| 201 | Created | Order successfully created |
| 400 | Bad Request | Missing fields, validation failed, insufficient stock |
| 401 | Unauthorized | Missing/invalid JWT token |
| 403 | Forbidden | Not authorized (non-admin accessing admin endpoint, user accessing other user's order) |
| 404 | Not Found | Order/product not found |
| 500 | Server Error | Database error, unexpected exception |

---

## Common Workflows

### 1. Order Creation Workflow
```
1. GET /api/products - Browse products
2. (Build cart locally in frontend)
3. POST /api/orders - Create order
   ↓ Response includes razorpay_order_id
4. Open Razorpay payment gateway with razorpay_order_id
5. User completes payment
6. (Razorpay webhook calls POST /api/orders/webhook/razorpay)
7. GET /api/orders/:id - Check order status (should be 'paid')
```

### 2. Order Tracking Workflow
```
1. GET /api/orders - List user's orders
2. Click on order
3. GET /api/orders/:id - View order details
4. Keep checking status as it progresses:
   pending → paid → shipped → delivered
```

### 3. Admin Order Management Workflow
```
1. GET /api/orders/admin/stats - Dashboard overview
2. Filter orders by status and review pending orders
3. PUT /api/orders/:id - Update status as fulfillment progresses
4. Notify customer via email (frontend responsibility)
```

---

## Integration with Frontend

### Web/Mobile Implementation

```javascript
// 1. Create order
const response = await fetch('http://localhost:3000/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    items: cart.items,
    shipping_address: formData
  })
});

const { order } = await response.json();

// 2. Open Razorpay
const options = {
  key: process.env.RAZORPAY_KEY_ID,
  amount: order.total_price * 100, // in paise
  order_id: order.razorpay_order_id,
  handler: function(response) {
    // Payment successful
    // Webhook will update order status
  }
};

const razorpay = new Razorpay(options);
razorpay.open();

// 3. Check order status
const orderDetail = await fetch(
  `http://localhost:3000/api/orders/${order.id}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

---

## Environment Variables

```env
# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Server
NODE_ENV=development
PORT=3000
```

---

## Next Steps

- Review API integration
- Custom orders (Phase 5)
- Admin dashboard
- Inventory management
