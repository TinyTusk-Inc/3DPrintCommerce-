# Admin Dashboard API Documentation

## Overview

The Admin Dashboard API provides comprehensive inventory management and order fulfillment tracking features:
- Real-time dashboard metrics
- Inventory management with stock adjustments
- Inventory change history/audit logs
- Order fulfillment queue with status tracking
- Fulfillment performance metrics
- Stock level alerts and reorder suggestions

---

## Authentication

**All endpoints require admin authentication:**
```
Authorization: Bearer <jwt-token>  (user must have role: 'admin')
```

---

## Dashboard Overview

### GET /api/admin/dashboard
High-level overview with key business metrics.

**No query parameters**

**Example Request:**
```bash
curl http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer admin-jwt-token"
```

**Response (200):**
```json
{
  "dashboard": {
    "products": {
      "total": 45,
      "low_stock": 7
    },
    "orders": {
      "total": 142,
      "pending": 3,
      "paid": 12,
      "shipped": 25,
      "delivered": 98
    },
    "revenue": {
      "total": 45230.75,
      "average_order_value": 462.05,
      "completed_orders": 98
    }
  }
}
```

**Metrics Explained:**
- **low_stock** - Products below 10 units
- **orders by status** - Count in each status
- **revenue** - Only from delivered + shipped + paid orders (not pending)
- **average_order_value** - revenue / completed_orders

---

## Inventory Management

### GET /api/admin/inventory
List all products with stock status and reorder information.

**Query Parameters:**
- `sort` (default: `by_stock_asc`) - `by_name`, `by_stock_asc`, `by_stock_desc`
- `category_id` (optional) - UUID to filter by category
- `low_stock_only` (optional) - `true` to show only items below 10 units
- `page` (default: 1)
- `limit` (default: 50, max: 100)

**Example Requests:**
```bash
# Get all products sorted by stock (low to high)
curl "http://localhost:3000/api/admin/inventory?sort=by_stock_asc" \
  -H "Authorization: Bearer admin-jwt-token"

# Get only low stock items
curl "http://localhost:3000/api/admin/inventory?low_stock_only=true" \
  -H "Authorization: Bearer admin-jwt-token"

# Filter by category, sorted by name
curl "http://localhost:3000/api/admin/inventory?category_id=uuid&sort=by_name" \
  -H "Authorization: Bearer admin-jwt-token"

# Page 2 with 25 items per page
curl "http://localhost:3000/api/admin/inventory?page=2&limit=25" \
  -H "Authorization: Bearer admin-jwt-token"
```

**Response (200):**
```json
{
  "inventory": [
    {
      "id": "product-uuid-1",
      "seller_id": "seller-uuid",
      "name": "PLA Filament Red",
      "description": "Premium quality",
      "price": 25.99,
      "quantity_in_stock": 5,
      "category_id": "category-uuid",
      "image_urls": ["https://..."],
      "created_at": "2026-04-12T10:00:00Z",
      "updated_at": "2026-04-12T10:00:00Z",
      "reorder_status": "low",
      "recent_activity": "2026-04-12T11:30:00Z",
      "inventory_summary": {
        "add": 100,
        "remove": 20,
        "sold": 75,
        "add_count": 5,
        "remove_count": 2,
        "sold_count": 45
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 45,
    "pages": 1
  },
  "filters": {
    "sort": "by_stock_asc",
    "category_id": null,
    "low_stock_only": false
  }
}
```

**Reorder Status Levels:**
- `low` - Less than 10 units (urgent reorder)
- `medium` - 10-20 units (plan reorder soon)
- `ok` - 20+ units (adequate stock)

---

### GET /api/admin/inventory/low-stock
Focused view of low-stock products with reorder suggestions.

**Query Parameters:**
- `threshold` (default: 10) - Stock level to consider "low"
- `page` (default: 1)
- `limit` (default: 50, max: 100)

**Example Request:**
```bash
# Get products below 15 units (custom threshold)
curl "http://localhost:3000/api/admin/inventory/low-stock?threshold=15" \
  -H "Authorization: Bearer admin-jwt-token"
```

**Response (200):**
```json
{
  "low_stock_products": [
    {
      "id": "product-uuid",
      "name": "ABS Filament Black",
      "quantity_in_stock": 3,
      "price": 35.99,
      "category_id": "category-uuid",
      "category_name": "3D Printing Supplies",
      "reorder_amount": 30,
      "created_at": "2026-04-12T10:00:00Z"
    }
  ],
  "threshold": 10,
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 7,
    "pages": 1
  }
}
```

**Reorder Amount Calculation:**
- Formula: `max(25, ceil(threshold * 3))`
- Example: threshold=10 → suggest ordering 30 units
- Minimum suggestion is always 25 units

---

### POST /api/admin/inventory/:id/adjust
Adjust product inventory (add or remove stock).

**Parameters:**
- `id` (required) - Product UUID

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "add",
  "quantity": 50,
  "reason": "Restock from supplier - PO#12345"
}
```

**Validation:**
- `action` - Must be "add" or "remove"
- `quantity` - Positive integer only
- `reason` - Required, non-empty string
- Cannot remove more than available stock

**Example Requests:**
```bash
# Add inventory
curl -X POST http://localhost:3000/api/admin/inventory/product-uuid/adjust \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add",
    "quantity": 50,
    "reason": "Restock from supplier - Order arrived"
  }'

# Remove due to damage
curl -X POST http://localhost:3000/api/admin/inventory/product-uuid/adjust \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "remove",
    "quantity": 5,
    "reason": "Damaged during shipment"
  }'
```

**Response (200):**
```json
{
  "product": {
    "id": "product-uuid",
    "name": "PLA Filament Red",
    "old_stock": 10,
    "new_stock": 60,
    "change": "+50"
  },
  "action": "add",
  "reason": "Restock from supplier - Order arrived",
  "message": "Inventory adjusted successfully"
}
```

**Error Responses:**
- `400` - Invalid action, quantity, or reason
- `400` - Cannot remove more than available
- `404` - Product not found
- `500` - Server error

---

### GET /api/admin/inventory/:id/logs
Get inventory change history for a product (audit trail).

**Parameters:**
- `id` (required) - Product UUID

**Query Parameters:**
- `action` (optional) - Filter by: `add`, `remove`, `sold`
- `page` (default: 1)
- `limit` (default: 50, max: 100)

**Example Requests:**
```bash
# Get all changes for product
curl "http://localhost:3000/api/admin/inventory/product-uuid/logs" \
  -H "Authorization: Bearer admin-jwt-token"

# Get only removals (damage, adjustments)
curl "http://localhost:3000/api/admin/inventory/product-uuid/logs?action=remove" \
  -H "Authorization: Bearer admin-jwt-token"

# Get only sales
curl "http://localhost:3000/api/admin/inventory/product-uuid/logs?action=sold" \
  -H "Authorization: Bearer admin-jwt-token"
```

**Response (200):**
```json
{
  "product": {
    "id": "product-uuid",
    "name": "PLA Filament Red",
    "current_stock": 60
  },
  "logs": [
    {
      "id": "log-uuid",
      "product_id": "product-uuid",
      "action": "add",
      "quantity_delta": 50,
      "reason": "Restock from supplier",
      "created_at": "2026-04-12T11:30:00Z"
    },
    {
      "id": "log-uuid",
      "product_id": "product-uuid",
      "action": "sold",
      "quantity_delta": -2,
      "reason": null,
      "created_at": "2026-04-12T10:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "pages": 1
  }
}
```

**Log Actions:**
- `add` - Manual stock addition
- `remove` - Manual stock removal
- `sold` - Automatic (when order placed)

---

## Order Fulfillment Tracking

### GET /api/admin/fulfillment
Get order fulfillment queue - orders ready to pack and ship.

**Query Parameters:**
- `status` (optional) - Filter by: `pending`, `paid`, `shipped`
  - Default: shows `paid` and `shipped` orders
- `sort` (default: `by_date`) - `by_date`, `by_total`, `by_items`
- `page` (default: 1)
- `limit` (default: 50, max: 100)

**Example Requests:**
```bash
# Get default fulfillment queue (paid orders first to process)
curl "http://localhost:3000/api/admin/fulfillment" \
  -H "Authorization: Bearer admin-jwt-token"

# Get only paid orders (awaiting fulfillment)
curl "http://localhost:3000/api/admin/fulfillment?status=paid" \
  -H "Authorization: Bearer admin-jwt-token"

# Sort by total value (large orders first)
curl "http://localhost:3000/api/admin/fulfillment?sort=by_total" \
  -H "Authorization: Bearer admin-jwt-token"

# Sort by number of items (complex orders first)
curl "http://localhost:3000/api/admin/fulfillment?sort=by_items" \
  -H "Authorization: Bearer admin-jwt-token"
```

**Response (200):**
```json
{
  "fulfillment_queue": [
    {
      "id": "order-uuid",
      "user_id": "user-uuid",
      "seller_id": "seller-uuid",
      "status": "paid",
      "total_price": 125.50,
      "razorpay_order_id": "order_xyz",
      "razorpay_payment_id": "pay_abc",
      "created_at": "2026-04-12T09:30:00Z",
      "updated_at": "2026-04-12T09:30:00Z",
      "item_count": 2,
      "items": [
        {
          "product_name": "PLA Filament Red",
          "quantity": 2,
          "price": 25.99
        },
        {
          "product_name": "ABS Filament Black",
          "quantity": 1,
          "price": 35.99
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "pages": 1
  },
  "status_filter": "paid, shipped"
}
```

**Workflow Priority:**
1. View `paid` orders (ready to pack)
2. Mark as `shipped` (with tracking)
3. Wait for delivery confirmation
4. Mark as `delivered`

---

### GET /api/admin/fulfillment/metrics
Get fulfillment performance metrics and KPIs.

**No query parameters**

**Example Request:**
```bash
curl http://localhost:3000/api/admin/fulfillment/metrics \
  -H "Authorization: Bearer admin-jwt-token"
```

**Response (200):**
```json
{
  "metrics": {
    "orders": {
      "pending": 2,
      "paid": 5,
      "shipped": 8,
      "delivered": 120,
      "cancelled": 2,
      "total": 137
    },
    "fulfillment": {
      "rate": "87.59%",
      "completed": 120,
      "in_progress": 8,
      "pending": 5
    },
    "revenue": {
      "from_delivered": 45000.50,
      "from_shipped": 4500.25,
      "pending_payment": 2300.75
    }
  }
}
```

**Metrics Explained:**
- **Fulfillment Rate** - (delivered / total) × 100
- **Completed** - Orders in delivered status
- **In Progress** - Ships currently in transit
- **Pending** - Orders waiting fulfillment

---

### PUT /api/admin/fulfillment/:id
Update order fulfillment status with optional tracking information.

**Parameters:**
- `id` (required) - Order UUID

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "shipped",
  "tracking_number": "1Z999AA10123456784",
  "notes": "Shipped via FedEx Ground"
}
```

**Valid Status Transitions:**
```
pending → paid → shipped → delivered
                    ↓
                cancelled (any status)
```

**Fields:**
- `status` (required) - `shipped`, `delivered`, or `cancelled`
- `tracking_number` (optional) - Carrier tracking ID (useful for shipped)
- `notes` (optional) - Internal notes about fulfillment

**Example Requests:**
```bash
# Mark order as shipped with tracking
curl -X PUT http://localhost:3000/api/admin/fulfillment/order-uuid \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped",
    "tracking_number": "1Z999AA10123456784",
    "notes": "Shipped via FedEx Ground - Customer notified"
  }'

# Mark as delivered
curl -X PUT http://localhost:3000/api/admin/fulfillment/order-uuid \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "delivered",
    "notes": "Signed for by customer"
  }'

# Cancel order
curl -X PUT http://localhost:3000/api/admin/fulfillment/order-uuid \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cancelled",
    "notes": "Customer requested cancellation"
  }'
```

**Response (200):**
```json
{
  "order": {
    "id": "order-uuid",
    "user_id": "user-uuid",
    "seller_id": "seller-uuid",
    "status": "shipped",
    "old_status": "paid",
    "total_price": 125.50,
    "razorpay_order_id": "order_xyz",
    "updated_at": "2026-04-12T12:00:00Z"
  },
  "tracking_number": "1Z999AA10123456784",
  "notes": "Shipped via FedEx Ground - Customer notified",
  "message": "Order status updated to shipped with tracking: 1Z999AA10123456784"
}
```

**Error Responses:**
- `400` - Invalid status or invalid transition
- `401` - Missing or invalid token
- `403` - User is not admin
- `404` - Order not found
- `500` - Server error

---

## Common Workflows

### Workflow 1: Daily Inventory Check
```
1. GET /api/admin/dashboard
   ↓ Check low_stock count
2. GET /api/admin/inventory/low-stock?threshold=20
   ↓ Review items needing reorder
3. Reach out to suppliers for items with reorder_amount > 50
```

### Workflow 2: Inventory Adjustment
```
1. New shipment arrives from supplier
2. POST /api/admin/inventory/:id/adjust
   {
     "action": "add",
     "quantity": 100,
     "reason": "Shipment from supplier - PO#2024-001"
   }
3. GET /api/admin/inventory/:id/logs
   ↓ Verify adjustment was recorded
```

### Workflow 3: Daily Order Fulfillment
```
1. GET /api/admin/fulfillment
   ↓ See paid orders ready to pack/ship
2. For each order:
   - Pack items
   - Get tracking number from carrier
   - PUT /api/admin/fulfillment/:id
     {
       "status": "shipped",
       "tracking_number": "..."
     }
3. GET /api/admin/fulfillment/metrics
   ↓ Monitor fulfillment rate
```

### Workflow 4: Weekly Performance Review
```
1. GET /api/admin/dashboard
   ↓ Review overall metrics
2. GET /api/admin/fulfillment/metrics
   ↓ Check fulfillment rate and revenue
3. GET /api/admin/inventory
   ↓ Review low stock situations
4. Plan next week's procurement and staffing
```

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

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (not admin) |
| 404 | Not found |
| 500 | Server error |

---

## Integration Notes

### Frontend Admin Dashboard Components

```javascript
// Get dashboard overview
const dashResponse = await fetch('/api/admin/dashboard', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

// Monitor inventory
const inventoryResponse = await fetch('/api/admin/inventory?low_stock_only=true', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

// Track fulfillment
const fulfillmentResponse = await fetch('/api/admin/fulfillment?status=paid', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

// Update order status
await fetch(`/api/admin/fulfillment/${orderId}`, {
  method: 'PUT',
  headers: { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'shipped',
    tracking_number: userInput.trackingNumber
  })
});
```

---

## Next Steps

- Review endpoints (product ratings & comments)
- Custom orders (Phase 5 - file uploads, validation)
- Notification system (customer updates on orders)
- Advanced analytics and reporting
