# 3D Printed Product Ecommerce Platform

A comprehensive cross-platform ecommerce solution with custom 3D printing capabilities.

## Project Structure (Monorepo)

```
3DPrintCommerce/
├── backend/           Node.js/Express API
│   └── src/
│       ├── models/    Database models
│       ├── routes/    API routes
│       ├── controllers/ Business logic
│       ├── middleware/ Auth, validation, error handling
│       ├── services/  External integrations (S3, email, virus scan, etc.)
│       └── config/    Database and environment config
├── web/              React frontend
│   └── src/
│       ├── pages/    Route pages
│       ├── components/ Reusable components
│       ├── hooks/    Custom React hooks
│       ├── context/  Auth and Cart context
│       └── services/ Backend API calls
├── mobile/           React Native app
│   └── src/
│       ├── screens/   Navigation screens
│       ├── components/ Shared components
│       ├── hooks/    Custom hooks
│       ├── context/  Auth and Cart context
│       └── services/ Shared API client
└── shared/           Shared utilities and validators
    ├── validators.js
    ├── constants.js
    └── fileValidation.js
```

## Quick Start

### Prerequisites
- Docker Desktop ([download](https://www.docker.com/products/docker-desktop))
- Node.js 14+ installed

### Development (Local)
```bash
# 1. Start PostgreSQL in Docker
docker-compose up -d

# 2. Initialize backend
cd backend
npm install
npm run setup-db:seed

# 3. Start development
export REACT_APP_USE_FAKE_API=true #To use FAKE_API for testing
npm run dev
```

### Documentation
- **[AUTHENTICATION.md](AUTHENTICATION.md)** — JWT auth system, login/register, protected routes
- **[MODELS.md](MODELS.md)** — Database models API reference
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** — Complete Docker guide
- **[DOCKER_COMPOSE_REFERENCE.md](DOCKER_COMPOSE_REFERENCE.md)** — Dev vs Prod explanation
- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** — Database initialization guide
- **[SCHEMA.md](SCHEMA.md)** — Database schema and ER diagram

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Web**: React, React Router, Tailwind CSS
- **Mobile**: React Native
- **Auth**: JWT
- **Payments**: Razorpay UPI
- **Email**: SendGrid/Nodemailer
- **File Storage**: AWS S3 / Cloudinary
- **Virus Scanning**: ClamAV / VirusTotal

## Development Phases

1. **Phase 1**: User authentication & product listing
2. **Phase 2**: Shopping cart & checkout
3. **Phase 3**: Order management & reviews
4. **Phase 4**: Admin dashboard & inventory
5. **Phase 5**: Custom 3D printing orders with file validation

## License
ISC
