# Vehicle Rental Management Backend — Design Spec

## Overview

REST API for a vehicle rental company. Staff authenticate via JWT cookies, manage vehicle fleet, record customer rentals with overlap prevention, and generate monthly reports.

## Decisions

| Area | Choice | Reasoning |
|------|--------|-----------|
| Database | PostgreSQL 16 (Docker) | Date range support, spec preference |
| Auth | httpOnly cookies, 1h access + 7d refresh | Security (XSS protection) |
| Architecture | Layered (Routes → Controllers → Services → Repos) | Testable, standard Express pattern |
| Overlap check | Application-level + transaction | Portable, user-friendly errors |
| Report calc | SQL date clipping | Efficient, single query per vehicle |
| API docs | OpenAPI 3.0 + Scalar UI | Modern, interactive docs |
| Photos | Multer, JPEG/PNG/WebP, 10MB max | Flexible format support |
| Pagination | 20/page, max 100 | Standard API defaults |

## Architecture

```
src/
  config/          # DB, env, constants
  middleware/       # auth, validation, error handler
  routes/          # route definitions (thin)
  controllers/     # HTTP request/response handling
  services/        # business logic
  repositories/    # Knex queries
  validators/      # Joi schemas
  docs/            # OpenAPI spec
  types/           # TypeScript interfaces
  utils/           # date helpers
  migrations/      # Knex migrations
  seeds/           # seed data
  app.ts           # Express setup
  server.ts        # Entry point
```

**Layer responsibilities:**
- Routes: wire HTTP method → controller
- Controllers: parse req/res, call services
- Services: business logic, call repositories
- Repositories: Knex queries only

## Database Schema

### staff
```sql
CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### vehicles
```sql
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plate_number VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,
  photo_path VARCHAR(500),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### rentals
```sql
CREATE TABLE rentals (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'booked',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Status values:** `booked`, `ongoing`, `completed`, `cancelled`

**Indexes:**
- `rentals(vehicle_id)` — FK lookup
- `rentals(status)` — filter active
- `rentals(start_date, end_date)` — overlap queries
- `vehicles(category)` — filter
- `vehicles(deleted_at)` — soft delete

## Authentication

**Login flow:**
1. Validate email/password with Joi
2. Query staff by email, bcrypt compare
3. Generate access token (1h) + refresh token (7d)
4. Set httpOnly, secure, sameSite=strict cookies
5. Return `{ message: "Logged in" }`

**Token payloads:**
```typescript
// Access
{ staffId: number, email: string, type: "access" }

// Refresh
{ staffId: number, type: "refresh" }
```

**Middleware:** `authenticate` reads access token from cookie, verifies JWT, attaches `req.staff`. On expired access token, rotate via refresh token.

**Routes protected:** All `/vehicles`, `/rentals`, `/reports`

## API Endpoints

### Auth
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/login` | `{ email, password }` | `{ message }` + cookies |
| POST | `/auth/logout` | — | `{ message }` + clear cookies |
| POST | `/auth/refresh` | — | rotated cookies |

### Vehicles
| Method | Path | Query/Body | Response |
|--------|------|------------|----------|
| GET | `/vehicles` | `?page=&limit=&category=&search=` | `{ data, pagination }` |
| GET | `/vehicles/:id` | — | vehicle object |
| POST | `/vehicles` | multipart: name, plate_number, category, daily_rate, photo | created vehicle |
| PUT | `/vehicles/:id` | multipart: same fields | updated vehicle |
| DELETE | `/vehicles/:id` | — | `{ message }` |

### Rentals
| Method | Path | Query/Body | Response |
|--------|------|------------|----------|
| GET | `/rentals` | `?vehicle_id=&status=&start=&end=&page=&limit=` | `{ data, pagination }` |
| GET | `/rentals/:id` | — | rental object |
| POST | `/rentals` | `{ vehicle_id, customer_name, customer_phone, start_date, end_date }` | created rental (409 if overlap) |
| PUT | `/rentals/:id` | same body | updated rental (409 if overlap) |
| DELETE | `/rentals/:id` | — | `{ message }` |

### Reports
| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/reports/rentals` | `?month=YYYY-MM&vehicle_id=` | `{ vehicles: [...], top_vehicle }` |

### Response format
```typescript
// Success
{ data: T }

// Paginated
{ data: T[], pagination: { page, limit, total, totalPages } }

// Error
{ error: string, details?: any }
```

### API Documentation
- OpenAPI 3.0 spec in `src/docs/openapi.ts`
- Scalar UI served at `GET /docs`
- Includes all endpoints, auth scheme, error formats

## Overlap Check

**Active statuses:** `booked`, `ongoing`

**Overlap condition:**
```sql
existing.start_date <= new.end_date
AND existing.end_date >= new.start_date
```

**Transaction flow (create):**
```sql
BEGIN;
  SELECT id FROM vehicles WHERE id = $1 FOR UPDATE;
  SELECT id FROM rentals WHERE vehicle_id = $1
    AND status IN ('booked', 'ongoing')
    AND start_date <= $2 AND end_date >= $3 LIMIT 1;
  -- If no overlap:
  INSERT INTO rentals (...) VALUES (...);
COMMIT;
```

**Transaction flow (update):**
- Same, but exclude current rental from overlap check

**Error:** `{ error: "Vehicle already booked for these dates", conflicting_rental_id: 5 }` (409)

## Report Calculation

**Date clipping formula:**
```sql
days_in_month = EXTRACT(DAY FROM (
  LEAST(r.end_date, month_end) - GREATEST(r.start_date, month_start)
)) + 1

revenue = days_in_month * v.daily_rate
```

**Full query:**
```sql
SELECT
  v.id, v.name,
  COUNT(r.id) AS total_bookings,
  SUM((EXTRACT(DAY FROM (LEAST(r.end_date, $2)
    - GREATEST(r.start_date, $1))) + 1))::int AS days_rented,
  SUM((EXTRACT(DAY FROM (LEAST(r.end_date, $2)
    - GREATEST(r.start_date, $1))) + 1) * v.daily_rate)::numeric(10,2) AS revenue
FROM vehicles v
JOIN rentals r ON r.vehicle_id = v.id
WHERE r.status IN ('booked', 'ongoing', 'completed')
  AND r.start_date <= $2 AND r.end_date >= $1
  AND ($3::int IS NULL OR r.vehicle_id = $3)
GROUP BY v.id, v.name
ORDER BY revenue DESC;
```

**Top vehicle:** First row after `ORDER BY revenue DESC`

**Response:**
```json
{
  "vehicles": [
    { "id": 1, "name": "Toyota Camry", "total_bookings": 3, "days_rented": 15, "revenue": 750.00 }
  ],
  "top_vehicle": { "id": 1, "name": "Toyota Camry", "revenue": 750.00 }
}
```

## File Structure

```
rent_a_car/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── package.json
├── tsconfig.json
├── knexfile.ts
├── docs/
│   └── project_description.md
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   └── env.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── validate.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── vehicle.routes.ts
│   │   ├── rental.routes.ts
│   │   └── report.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── vehicle.controller.ts
│   │   ├── rental.controller.ts
│   │   └── report.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── vehicle.service.ts
│   │   ├── rental.service.ts
│   │   └── report.service.ts
│   ├── repositories/
│   │   ├── staff.repository.ts
│   │   ├── vehicle.repository.ts
│   │   └── rental.repository.ts
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── vehicle.validator.ts
│   │   └── rental.validator.ts
│   ├── docs/
│   │   └── openapi.ts
│   ├── types/
│   │   ├── express.d.ts
│   │   └── index.ts
│   ├── utils/
│   │   └── dateClipping.ts
│   ├── migrations/
│   │   └── 001_initial.ts
│   ├── seeds/
│   │   └── 001_data.ts
│   ├── app.ts
│   └── server.ts
└── tests/
    ├── unit/services/
    ├── integration/
    │   ├── auth.test.ts
    │   ├── vehicles.test.ts
    │   └── rentals.test.ts
    ├── api/endpoints.test.ts
    ├── database/queries.test.ts
    └── setup.ts
```

## Testing

**Phase 1 (initial build):**
- Unit tests for services (mock repositories)
- Integration tests for API endpoints (Supertest + test DB)
- Database query tests (overlap check, report calculation)

**Phase 2 (follow-up):**
- Performance/load tests (k6 or artillery)
- E2E tests (Playwright)
- Smoke tests

## Docker

**docker-compose.yml:**
- PostgreSQL 16 service with health check
- App service (builds from Dockerfile)
- Volume for DB persistence
- App connects via `db` service name

**.env.example:**
```
DATABASE_URL=postgresql://postgres:password@db:5432/rent_a_car
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3000
UPLOAD_PATH=./uploads
```

## Seed Data

Rich dataset:
- 3+ staff accounts
- 8-10 vehicles across categories (Sedan, SUV, Truck, etc.)
- 10+ rentals spanning multiple months
- At least 1 rental crossing month boundary (for report testing)
- Mix of statuses (booked, ongoing, completed, cancelled)
