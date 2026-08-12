# Rent a Car — Vehicle Rental Management API

REST API for managing vehicle rentals, built with Node.js, TypeScript, Express, and PostgreSQL.

## Setup

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your database credentials
4. Start PostgreSQL:
   ```bash
   docker-compose up -d
   ```
5. Run migrations and seed data:
   ```bash
   npm run migrate
   npm run seed
   ```
6. Start the dev server:
   ```bash
   npm run dev
   ```

## API Documentation

Visit `http://localhost:3001/docs` for interactive API docs (Scalar UI).

The raw OpenAPI spec is available at `http://localhost:3001/openapi.json`.

## Testing

```bash
npm test                  # Run all tests (uses --runInBand)
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

## Endpoints

### Auth
- `POST /auth/login` — Login (returns httpOnly cookies)
- `POST /auth/logout` — Logout (clears cookies)
- `POST /auth/logout` — Refresh token

### Vehicles
- `GET /vehicles` — List vehicles (paginated, filterable by category/search)
- `GET /vehicles/:id` — Get vehicle by ID
- `POST /vehicles` — Create vehicle (multipart/form-data with optional photo)
- `PUT /vehicles/:id` — Update vehicle
- `DELETE /vehicles/:id` — Soft delete vehicle

### Rentals
- `GET /rentals` — List rentals (filterable by vehicle_id, status, date range)
- `GET /rentals/:id` — Get rental by ID
- `POST /rentals` — Create rental (with overlap prevention)
- `PUT /rentals/:id` — Update rental
- `DELETE /rentals/:id` — Delete rental

### Reports
- `GET /reports/rentals?month=YYYY-MM` — Monthly rental report (filterable by vehicle_id)

## Tech Stack

- **Runtime:** Node.js 22
- **Language:** TypeScript (strict)
- **Framework:** Express 5
- **Database:** PostgreSQL 17 (Docker)
- **ORM:** Knex.js
- **Auth:** JWT (httpOnly cookies, access + refresh tokens)
- **Validation:** Joi
- **Testing:** Jest + Supertest
- **API Docs:** OpenAPI 3.0 + Scalar UI

## Project Structure

```
src/
├── config/         # Database, env validation
├── controllers/    # Request handlers
├── docs/           # OpenAPI spec
├── middleware/      # Auth, validation, error handling, logger
├── migrations/     # Database migrations
├── repositories/   # Database queries
├── routes/         # Express routers
├── seeds/          # Seed data
├── services/       # Business logic
├── types/          # TypeScript types
└── utils/          # Utilities (date clipping)
tests/
├── helpers.ts      # Test database setup
└── integration/    # Integration tests
```
