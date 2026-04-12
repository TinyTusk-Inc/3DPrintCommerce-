# Authentication System Documentation

## Overview

The authentication system uses **JWT (JSON Web Tokens)** for stateless authentication with **bcrypt** for secure password hashing.

### Key Features
- User registration with email & password
- User login with JWT token generation
- Protected routes requiring authentication
- Role-based access control (admin, seller)
- Password hashing with bcrypt
- Token expiration (7 days)

---

## How It Works

### 1. Registration Flow
```
POST /api/auth/register
  ↓
Validate input (email, password, name)
  ↓
Hash password with bcrypt
  ↓
Create user in database
  ↓
Generate JWT token (expires in 7 days)
  ↓
Return user object + token
```

### 2. Login Flow
```
POST /api/auth/login
  ↓
Validate input (email, password)
  ↓
Find user by email
  ↓
Compare provided password with stored hash
  ↓
If match: Generate JWT token
  ↓
Return user object + token
  ↓
If no match: Return 401 Unauthorized
```

### 3. Protected Route Flow
```
GET /api/auth/me (with Authorization header)
  ↓
Extract token from "Bearer <token>" header
  ↓
Verify token signature using JWT_SECRET
  ↓
If valid: Decode token → attach user to req.user
  ↓
Next middleware/controller executes
  ↓
If invalid/expired: Return 401 Unauthorized
```

---

## Files

### `backend/src/controllers/authController.js`
Handles all authentication logic:
- `register(req, res)` - Create new user
- `login(req, res)` - Authenticate user
- `getCurrentUser(req, res)` - Get current user profile [protected]
- `updateProfile(req, res)` - Update user info [protected]
- `changePassword(req, res)` - Change password [protected]
- `logout(req, res)` - Logout confirmation

### `backend/src/middleware/authMiddleware.js`
JWT verification and role checking:
- `verifyToken(req, res, next)` - Verify JWT token
- `verifyAdmin(req, res, next)` - Check admin role
- `verifySeller(req, res, next)` - Check seller role
- `optionalAuth(req, res, next)` - Optional token (don't require, but extract if present)

### `backend/src/routes/authRoutes.js`
API endpoint definitions:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me` [protected]
- `PUT /api/auth/me` [protected]
- `POST /api/auth/change-password` [protected]

---

## API Endpoints

### Public Endpoints

#### POST /api/auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "is_seller": false,
    "is_admin": false,
    "created_at": "2026-04-12T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400` - Missing fields or validation error
- `409` - Email already registered

---

#### POST /api/auth/login
Authenticate user and get JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "address": null,
    "is_seller": false,
    "is_admin": false,
    "created_at": "2026-04-12T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400` - Missing fields
- `401` - Invalid email or password

---

#### POST /api/auth/logout
Logout confirmation (token removal happens on client).

**Response (200):**
```json
{
  "message": "Logged out successfully. Please remove the token from client storage."
}
```

---

### Protected Endpoints

#### GET /api/auth/me
Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "zip": "10001"
    },
    "is_seller": false,
    "is_admin": false,
    "created_at": "2026-04-12T10:00:00Z",
    "updated_at": "2026-04-12T10:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Missing or invalid token
- `404` - User not found

---

#### PUT /api/auth/me
Update current user profile.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Request:**
```json
{
  "name": "Jane Doe",
  "phone": "+9876543210",
  "address": {
    "street": "456 Oak Ave",
    "city": "Boston",
    "zip": "02101",
    "country": "USA"
  }
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe",
    "phone": "+9876543210",
    "address": {
      "street": "456 Oak Ave",
      "city": "Boston",
      "zip": "02101",
      "country": "USA"
    },
    "is_seller": false,
    "is_admin": false,
    "updated_at": "2026-04-12T11:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Invalid input
- `401` - Invalid token
- `404` - User not found

---

#### POST /api/auth/change-password
Change password for authenticated user.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Request:**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400` - Missing fields or password validation error
- `401` - Current password incorrect
- `404` - User not found

---

## Using Tokens in Requests

### Web (React/JavaScript)
```javascript
// Store token after login
localStorage.setItem('token', response.token);

// Include token in API requests
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
};

fetch('/api/auth/me', { headers })
  .then(res => res.json())
  .then(data => console.log(data.user));

// Logout
localStorage.removeItem('token');
```

### Mobile (React Native)
```javascript
// Store token securely
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('jwt_token', response.token);

// Include token in requests
const token = await SecureStore.getItemAsync('jwt_token');
const headers = {
  'Authorization': `Bearer ${token}`
};

fetch('/api/auth/me', { headers })
  .then(res => res.json())
  .then(data => console.log(data.user));

// Logout
await SecureStore.deleteItemAsync('jwt_token');
```

---

## Using Middleware in Routes

### Basic Protected Route
```javascript
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/protected-endpoint', verifyToken, (req, res) => {
  // req.user contains decoded JWT: { userId, email }
  console.log('Authenticated user:', req.user);
  res.json({ message: 'This is protected' });
});
```

### Admin-Only Route
```javascript
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/admin-only', verifyToken, verifyAdmin, (req, res) => {
  // Only users with is_admin=true can access
  res.json({ message: 'Admin access granted' });
});
```

### Seller-Only Route
```javascript
const { verifyToken, verifySeller } = require('../middleware/authMiddleware');

router.post('/seller-action', verifyToken, verifySeller, (req, res) => {
  // Only users with is_seller=true can access
  res.json({ message: 'Seller action completed' });
});
```

### Optional Authentication
```javascript
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/public-with-user-info', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({ message: 'Hello authenticated user', user: req.user });
  } else {
    res.json({ message: 'Hello guest' });
  }
});
```

---

## Configuration

### Environment Variables
Add to `.env.docker` or `.env.prod`:

```env
# JWT Configuration
JWT_SECRET=your-very-secret-key-here-change-this-in-production
JWT_EXPIRY=7d  # Token valid for 7 days

# Bcrypt Configuration (optional, defaults are secure)
BCRYPT_ROUNDS=10  # Higher = slower but more secure

# Server Port
PORT=3000

# Node Environment
NODE_ENV=development  # or production
```

### Changing JWT_SECRET
**IMPORTANT**: In production, use a strong random string:
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy output to .env.prod:
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## Password Requirements

- **Minimum length**: 6 characters
- **Hashing algorithm**: bcrypt with 10 rounds (customizable via BCRYPT_ROUNDS)
- **Comparison**: Secure constant-time comparison (bcrypt)

### Password Security Notes
- Passwords are **never** stored in plain text
- Passwords are **never** returned in API responses
- Passwords are **only** compared during login
- Use HTTPS in production to prevent token interception

---

## Common Issues & Solutions

### Issue: "Missing Authorization header"
**Solution**: Include header in request:
```javascript
headers: {
  'Authorization': 'Bearer ' + token
}
```

---

### Issue: "Token expired"
**Solution**: User needs to login again to get a new token

---

### Issue: "Invalid token"
**Solution**: Token may be corrupted. Common causes:
- Token was modified
- Token from different server (different JWT_SECRET)
- Token from a different app

---

### Issue: "Bearer <token> format invalid"
**Solution**: Header must be exactly `Bearer <token>` (with space)

```javascript
// Wrong
'Authorization': token  // Missing "Bearer "

// Correct
'Authorization': `Bearer ${token}`
```

---

## Testing Endpoints

### Using cURL

#### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "phone": "+1234567890"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Get Profile (Protected)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Update Profile (Protected)
```bash
curl -X PUT http://localhost:3000/api/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Updated Name",
    "phone": "+9876543210"
  }'
```

#### Change Password (Protected)
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword456"
  }'
```

---

## Security Best Practices

1. **Always use HTTPS in production** - prevents token interception
2. **Use strong JWT_SECRET** - at least 32 characters of random data
3. **Store tokens securely**:
   - Web: HttpOnly cookies (preferred) or secure localStorage
   - Mobile: Use platform secure storage (SecureStore)
4. **Never store passwords** - only hashes with bcrypt
5. **Implement token refresh** - short expiry + refresh token for long sessions (Phase 2)
6. **Log authentication events** - for security audit trail
7. **Rate limit login attempts** - prevent brute force attacks (Phase 2)
8. **Use CORS properly** - restrict to trusted domains only

---

## Next Steps

The authentication system is **production-ready**. Next phases:

### Phase 1 Extended
- Rate limiting on login endpoint
- Token refresh mechanism
- Password reset functionality
- Email verification on signup

### Phase 2
- Two-factor authentication (2FA)
- Social login (Google, Facebook)
- Session management
- Device tracking

### Phase 3+
- OAuth 2.0 for API integrations
- API key authentication for third-party services
- Audit logging for all authentication events
