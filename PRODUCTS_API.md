# Products & Categories API Documentation

## Overview

The Products API provides comprehensive endpoints for:
- Listing, searching, and filtering products
- Managing product inventory
- Creating, updating, and deleting products (admin)
- Organizing products into categories
- Managing categories (admin)

---

## Products API

### Public Endpoints

#### GET /api/products
List all products with advanced filtering and pagination.

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20, max: 100) - Items per page
- `search` (optional) - Search by product name or description
- `category_id` (optional) - Filter by category UUID
- `sort` (default: 'newest') - Sort order: `newest`, `price_asc`, `price_desc`, `rating`
- `price_min` (optional) - Minimum price filter
- `price_max` (optional) - Maximum price filter

**Example Request:**
```bash
# Get first 20 products
curl http://localhost:3000/api/products

# Search products with pagination
curl "http://localhost:3000/api/products?search=filament&page=1&limit=10"

# Filter by category and price range
curl "http://localhost:3000/api/products?category_id=uuid&price_min=10&price_max=50"

# Sort by price low to high
curl "http://localhost:3000/api/products?sort=price_asc"
```

**Response (200):**
```json
{
  "products": [
    {
      "id": "uuid",
      "seller_id": "uuid",
      "name": "PLA Filament Red",
      "description": "Premium quality red PLA filament",
      "price": 25.99,
      "quantity_in_stock": 100,
      "category_id": "uuid",
      "image_urls": ["https://...", "https://..."],
      "rating": 4.5,
      "review_count": 12,
      "created_at": "2026-04-12T10:00:00Z",
      "updated_at": "2026-04-12T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

**Error Responses:**
- `500` - Server error

---

#### GET /api/products/:id
Get single product with reviews and rating statistics.

**Parameters:**
- `id` (required) - Product UUID

**Example Request:**
```bash
curl http://localhost:3000/api/products/uuid-here
```

**Response (200):**
```json
{
  "product": {
    "id": "uuid",
    "seller_id": "uuid",
    "name": "PLA Filament Red",
    "description": "Premium quality red PLA filament",
    "price": 25.99,
    "quantity_in_stock": 100,
    "category_id": "uuid",
    "image_urls": ["https://..."],
    "created_at": "2026-04-12T10:00:00Z",
    "updated_at": "2026-04-12T10:00:00Z"
  },
  "reviews": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "user_id": "uuid",
      "rating": 5,
      "text": "Excellent quality!",
      "author_name": "John Doe",
      "created_at": "2026-04-12T10:00:00Z",
      "updated_at": "2026-04-12T10:00:00Z"
    }
  ],
  "stats": {
    "average_rating": 4.5,
    "review_count": 12
  }
}
```

**Error Responses:**
- `400` - Invalid product ID format
- `404` - Product not found
- `500` - Server error

---

#### GET /api/products/category/:categoryId
Get products by category with pagination.

**Parameters:**
- `categoryId` (required) - Category UUID

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Example Request:**
```bash
curl "http://localhost:3000/api/products/category/uuid-here?page=1&limit=10"
```

**Response (200):**
```json
{
  "category": {
    "id": "uuid",
    "name": "3D Printing Supplies",
    "description": "Filament, resins, and accessories",
    "created_at": "2026-04-12T10:00:00Z",
    "updated_at": "2026-04-12T10:00:00Z"
  },
  "products": [
    {
      "id": "uuid",
      "name": "PLA Filament Red",
      "price": 25.99,
      "rating": 4.5,
      "review_count": 12,
      "quantity_in_stock": 100,
      "image_urls": ["https://..."]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

**Error Responses:**
- `404` - Category not found
- `500` - Server error

---

### Admin Endpoints (Protected)

#### POST /api/products
Create new product.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "PLA Filament Red",
  "description": "Premium quality red PLA filament for 3D printing",
  "price": 25.99,
  "quantity_in_stock": 100,
  "category_id": "uuid",
  "image_urls": [
    "https://s3.amazonaws.com/bucket/image1.jpg",
    "https://s3.amazonaws.com/bucket/image2.jpg"
  ]
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PLA Filament Red",
    "description": "Premium quality",
    "price": 25.99,
    "quantity_in_stock": 100,
    "category_id": "uuid"
  }'
```

**Response (201):**
```json
{
  "product": {
    "id": "new-uuid",
    "seller_id": "uuid",
    "name": "PLA Filament Red",
    "description": "Premium quality",
    "price": 25.99,
    "quantity_in_stock": 100,
    "category_id": "uuid",
    "image_urls": [...],
    "created_at": "2026-04-12T10:00:00Z",
    "updated_at": "2026-04-12T10:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Missing/invalid fields, category not found
- `401` - Missing or invalid token
- `403` - User is not admin
- `500` - Server error

---

#### PUT /api/products/:id
Update product.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `id` (required) - Product UUID

**Request Body:** (all fields optional)
```json
{
  "name": "PLA Filament Red",
  "description": "Updated description",
  "price": 29.99,
  "quantity_in_stock": 150,
  "category_id": "uuid",
  "image_urls": ["https://..."]
}
```

**Example Request:**
```bash
curl -X PUT http://localhost:3000/api/products/uuid-here \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 29.99,
    "quantity_in_stock": 150
  }'
```

**Response (200):**
```json
{
  "product": {
    "id": "uuid",
    "name": "PLA Filament Red",
    "price": 29.99,
    "quantity_in_stock": 150,
    "updated_at": "2026-04-12T11:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Invalid input data
- `401` - Missing or invalid token
- `403` - User is not admin
- `404` - Product or category not found
- `500` - Server error

---

#### DELETE /api/products/:id
Delete product.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `id` (required) - Product UUID

**Example Request:**
```bash
curl -X DELETE http://localhost:3000/api/products/uuid-here \
  -H "Authorization: Bearer your-jwt-token"
```

**Response (200):**
```json
{
  "message": "Product deleted successfully"
}
```

**Error Responses:**
- `401` - Missing or invalid token
- `403` - User is not admin
- `404` - Product not found
- `500` - Server error

---

#### GET /api/products/admin/low-stock
Get low stock products (below threshold).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `threshold` (default: 10) - Stock level threshold

**Example Request:**
```bash
curl "http://localhost:3000/api/products/admin/low-stock?threshold=20" \
  -H "Authorization: Bearer your-jwt-token"
```

**Response (200):**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "PLA Filament Red",
      "quantity_in_stock": 5,
      "price": 25.99
    },
    {
      "id": "uuid",
      "name": "ABS Filament Black",
      "quantity_in_stock": 8,
      "price": 35.99
    }
  ],
  "threshold": 20
}
```

**Error Responses:**
- `401` - Missing or invalid token
- `403` - User is not admin
- `500` - Server error

---

## Categories API

### Public Endpoints

#### GET /api/categories
List all categories with product counts.

**Example Request:**
```bash
curl http://localhost:3000/api/categories
```

**Response (200):**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "3D Printing Supplies",
      "description": "Filament, resins, and accessories",
      "product_count": 25,
      "created_at": "2026-04-12T10:00:00Z",
      "updated_at": "2026-04-12T10:00:00Z"
    },
    {
      "id": "uuid",
      "name": "Nozzles & Tools",
      "description": "Replacement parts and tools",
      "product_count": 12,
      "created_at": "2026-04-12T10:00:00Z",
      "updated_at": "2026-04-12T10:00:00Z"
    }
  ]
}
```

---

#### GET /api/categories/:id
Get single category with product count.

**Parameters:**
- `id` (required) - Category UUID

**Example Request:**
```bash
curl http://localhost:3000/api/categories/uuid-here
```

**Response (200):**
```json
{
  "category": {
    "id": "uuid",
    "name": "3D Printing Supplies",
    "description": "Filament, resins, and accessories",
    "created_at": "2026-04-12T10:00:00Z",
    "updated_at": "2026-04-12T10:00:00Z"
  },
  "product_count": 25
}
```

**Error Responses:**
- `404` - Category not found
- `500` - Server error

---

### Admin Endpoints (Protected)

#### POST /api/categories
Create new category.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "3D Printing Supplies",
  "description": "Filament, resins, and accessories"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "3D Printing Supplies",
    "description": "Filament, resins, and accessories"
  }'
```

**Response (201):**
```json
{
  "category": {
    "id": "new-uuid",
    "name": "3D Printing Supplies",
    "description": "Filament, resins, and accessories",
    "created_at": "2026-04-12T10:00:00Z",
    "updated_at": "2026-04-12T10:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Name is required
- `401` - Missing or invalid token
- `403` - User is not admin
- `409` - Category with this name already exists
- `500` - Server error

---

#### PUT /api/categories/:id
Update category.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `id` (required) - Category UUID

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Category Name",
  "description": "Updated description"
}
```

**Example Request:**
```bash
curl -X PUT http://localhost:3000/api/categories/uuid-here \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Category Name"
  }'
```

**Response (200):**
```json
{
  "category": {
    "id": "uuid",
    "name": "Updated Category Name",
    "description": "Updated description",
    "updated_at": "2026-04-12T11:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Missing or invalid token
- `403` - User is not admin
- `404` - Category not found
- `409` - Category name already exists
- `500` - Server error

---

#### DELETE /api/categories/:id
Delete category.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `id` (required) - Category UUID

**Note:** Category must not have any products.

**Example Request:**
```bash
curl -X DELETE http://localhost:3000/api/categories/uuid-here \
  -H "Authorization: Bearer your-jwt-token"
```

**Response (200):**
```json
{
  "message": "Category deleted successfully"
}
```

**Error Responses:**
- `400` - Category has products (cannot delete)
- `401` - Missing or invalid token
- `403` - User is not admin
- `404` - Category not found
- `500` - Server error

---

## Common Filters & Sorting

### Search Examples
```bash
# Search for "filament"
/api/products?search=filament

# Search in specific category
/api/products?category_id=uuid&search=red

# Price range
/api/products?price_min=20&price_max=50
```

### Sort Examples
```bash
# Newest first (default)
/api/products?sort=newest

# Cheapest first
/api/products?sort=price_asc

# Most expensive first
/api/products?sort=price_desc

# Best rated
/api/products?sort=rating
```

### Pagination Examples
```bash
# Get 50 items per page
/api/products?limit=50

# Get page 3 (assuming 20 items per page)
/api/products?page=3&limit=20
```

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": "Error message",
  "message": "Additional details (if available in development mode)"
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `409` - Conflict (duplicate entry)
- `500` - Server error

---

## Rate Limiting

Currently not implemented. Consider adding in Phase 2:
- 100 requests per minute for public endpoints
- 50 requests per minute for authenticated endpoints
- 10 requests per minute for admin endpoints

---

## Next Steps

- Review endpoints
- Create Review routes (add ratings to products)
- Create Order routes (purchase management)
- Implement file uploads for product images
