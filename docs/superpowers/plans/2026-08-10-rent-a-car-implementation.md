# Vehicle Rental Management Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a REST API for vehicle rental management with JWT auth, overlap prevention, and monthly reports.

**Architecture:** Layered architecture (Routes → Controllers → Services → Repositories) with Express, Knex, PostgreSQL. httpOnly cookie-based JWT auth. Application-level overlap check in transactions.

**Tech Stack:** Node.js, TypeScript, Express, Knex, PostgreSQL 16, Joi, bcrypt, jsonwebtoken, multer, OpenAPI + Scalar, Jest + Supertest

## Global Constraints

- Node.js ≥ 18, TypeScript strict mode
- PostgreSQL 16 via Docker
- ESLint + Prettier enforced
- All env vars via `.env` (gitignored), `.env.example` committed
- httpOnly cookies for JWT (1h access, 7d refresh)
- Photos: JPEG/PNG/WebP, 10MB max, stored locally via Multer
- Pagination: 20/page, max 100
- Soft delete for vehicles (`deleted_at`)
- Overlap check in transaction with `FOR UPDATE` lock
- Report uses SQL date clipping (GREATEST/LEAST)

---

## Task 1: Project Setup & Docker

**Files:**
- Create: `docker-compose.yml`, `Dockerfile`, `.env.example`, `.eslintrc.js`, `.prettierrc`
- Create: `package.json`, `tsconfig.json`, `knexfile.ts`
- Create: `src/config/env.ts`, `src/config/database.ts`, `src/app.ts`, `src/server.ts`

**Dependencies:** None (first task)

- [ ] **Step 1:** Run `npm init -y`
- [ ] **Step 2:** Install deps: `npm install express knex pg bcrypt jsonwebtoken cookie-parser multer joi dotenv cors @scalar/express-api-reference`
- [ ] **Step 3:** Install dev deps: `npm install -D typescript @types/node @types/express @types/bcrypt @types/jsonwebtoken @types/cookie-parser @types/multer @types/cors ts-node-dev eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier jest ts-jest @types/jest supertest @types/supertest`
- [ ] **Step 4:** Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 5:** Create `.env.example`:
```
DATABASE_URL=postgresql://postgres:password@db:5432/rent_a_car
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
PORT=3000
UPLOAD_PATH=./uploads
NODE_ENV=development
```

- [ ] **Step 6:** Create `.eslintrc.js`:
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  env: { node: true, jest: true },
  rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] }
};
```

- [ ] **Step 7:** Create `.prettierrc`:
```json
{ "semi": true, "trailingComma": "all", "singleQuote": true, "printWidth": 100, "tabWidth": 2 }
```

- [ ] **Step 8:** Create `src/config/env.ts`:
```typescript
import dotenv from 'dotenv';
import Joi from 'joi';
dotenv.config();
const envSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required().min(32),
  JWT_REFRESH_SECRET: Joi.string().required().min(32),
  PORT: Joi.number().default(3000),
  UPLOAD_PATH: Joi.string().default('./uploads'),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development')
}).unknown(true);
const { error, value: envVars } = envSchema.validate(process.env);
if (error) throw new Error(`Environment validation error: ${error.message}`);
export const config = {
  db: { url: envVars.DATABASE_URL },
  jwt: { secret: envVars.JWT_SECRET, refreshSecret: envVars.JWT_REFRESH_SECRET, accessExpiry: '1h', refreshExpiry: '7d' },
  port: envVars.PORT,
  uploadPath: envVars.UPLOAD_PATH,
  nodeEnv: envVars.NODE_ENV
};
```

- [ ] **Step 9:** Create `src/config/database.ts`:
```typescript
import knex, { Knex } from 'knex';
import { config } from './env';
import knexConfig from '../../knexfile';
const knexInstance: Knex = knex(knexConfig[config.nodeEnv]);
export default knexInstance;
```
- [ ] **Step 10:** Create `knexfile.ts`:
```typescript
import type { Knex } from 'knex';
import { config } from './src/config/env';
const knexConfig: { [key: string]: Knex.Config } = {
  development: { client: 'pg', connection: config.db.url, migrations: { directory: './src/migrations', extension: 'ts' }, seeds: { directory: './src/seeds', extension: 'ts' } },
  production: { client: 'pg', connection: config.db.url, migrations: { directory: './src/migrations', extension: 'ts' }, seeds: { directory: './src/seeds', extension: 'ts' } },
  test: { client: 'pg', connection: config.db.url, migrations: { directory: './src/migrations', extension: 'ts' }, seeds: { directory: './src/seeds', extension: 'ts' } }
};
export default knexConfig;
```

- [ ] **Step 11:** Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: rent_a_car
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/rent_a_car
      JWT_SECRET: your-super-secret-jwt-key-change-in-production
      JWT_REFRESH_SECRET: your-super-secret-refresh-key-change-in-production
      PORT: 3000
      UPLOAD_PATH: ./uploads
      NODE_ENV: development
    depends_on:
      db: { condition: service_healthy }
    volumes: [./uploads:/app/uploads]
volumes:
  postgres_data:
```

- [ ] **Step 12:** Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

- [ ] **Step 13:** Create `src/app.ts`:
```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
app.use(errorHandler);
export default app;
```

- [ ] **Step 14:** Create `src/server.ts`:
```typescript
import app from './app';
import { config } from './config/env';
app.listen(config.port, () => { console.log(`Server running on port ${config.port}`); });
```

- [ ] **Step 15:** Add scripts to `package.json`:
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "migrate": "knex migrate:latest",
    "migrate:rollback": "knex migrate:rollback",
    "seed": "knex seed:run",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

- [ ] **Step 16:** Run `docker-compose up -d db` and verify PostgreSQL is healthy

- [ ] **Step 17:** Commit: `git add -A && git commit -m "feat: project setup with Docker, TypeScript, Express boilerplate"`

---

## Task 2: Database Migration & Seed

**Files:**
- Create: `src/migrations/001_initial.ts`
- Create: `src/seeds/001_data.ts`

**Dependencies:** Task 1

- [ ] **Step 1:** Create `src/migrations/001_initial.ts`:
```typescript
import { Knex } from 'knex';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('staff', (table) => {
    table.increments('id').primary();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('name', 255).notNullable();
    table.timestamps(true, true);
  });
  await knex.schema.createTable('vehicles', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('plate_number', 50).unique().notNullable();
    table.string('category', 100).notNullable();
    table.decimal('daily_rate', 10, 2).notNullable();
    table.string('photo_path', 500).nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamps(true, true);
    table.index('category');
    table.index('deleted_at');
  });
  await knex.schema.createTable('rentals', (table) => {
    table.increments('id').primary();
    table.integer('vehicle_id').unsigned().notNullable().references('id').inTable('vehicles').onDelete('RESTRICT');
    table.string('customer_name', 255).notNullable();
    table.string('customer_phone', 50).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('total_amount', 10, 2).notNullable();
    table.string('status', 20).defaultTo('booked');
    table.timestamps(true, true);
    table.index('vehicle_id');
    table.index('status');
    table.index(['start_date', 'end_date']);
  });
}
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rentals');
  await knex.schema.dropTableIfExists('vehicles');
  await knex.schema.dropTableIfExists('staff');
}
```

- [ ] **Step 2:** Run `npx knex migrate:latest` — verify tables created

- [ ] **Step 3:** Create `src/seeds/001_data.ts`:
```typescript
import { Knex } from 'knex';
import bcrypt from 'bcrypt';
export async function seed(knex: Knex): Promise<void> {
  await knex('rentals').del();
  await knex('vehicles').del();
  await knex('staff').del();
  const hash = await bcrypt.hash('password123', 10);
  const staff = await knex('staff').insert([
    { email: 'admin@rental.com', password_hash: hash, name: 'Admin User' },
    { email: 'staff1@rental.com', password_hash: hash, name: 'Staff One' },
    { email: 'staff2@rental.com', password_hash: hash, name: 'Staff Two' }
  ]).returning('id');
  const vehicles = await knex('vehicles').insert([
    { name: 'Toyota Camry', plate_number: 'ABC-1234', category: 'Sedan', daily_rate: 50.00 },
    { name: 'Honda CR-V', plate_number: 'DEF-5678', category: 'SUV', daily_rate: 75.00 },
    { name: 'Ford F-150', plate_number: 'GHI-9012', category: 'Truck', daily_rate: 100.00 },
    { name: 'Tesla Model 3', plate_number: 'JKL-3456', category: 'Electric', daily_rate: 80.00 },
    { name: 'Chevrolet Malibu', plate_number: 'MNO-7890', category: 'Sedan', daily_rate: 45.00 },
    { name: 'Jeep Wrangler', plate_number: 'PQR-1234', category: 'SUV', daily_rate: 90.00 },
    { name: 'Toyota Hilux', plate_number: 'STU-5678', category: 'Truck', daily_rate: 85.00 },
    { name: 'BMW 3 Series', plate_number: 'VWX-9012', category: 'Luxury', daily_rate: 120.00 },
    { name: 'Hyundai Tucson', plate_number: 'YZA-3456', category: 'SUV', daily_rate: 70.00 },
    { name: 'Nissan Altima', plate_number: 'BCD-7890', category: 'Sedan', daily_rate: 48.00 }
  ]).returning('id');
  await knex('rentals').insert([
    { vehicle_id: vehicles[0].id, customer_name: 'John Doe', customer_phone: '555-0101', start_date: '2026-07-28', end_date: '2026-08-03', total_amount: 300.00, status: 'completed' },
    { vehicle_id: vehicles[1].id, customer_name: 'Jane Smith', customer_phone: '555-0102', start_date: '2026-08-01', end_date: '2026-08-05', total_amount: 375.00, status: 'completed' },
    { vehicle_id: vehicles[2].id, customer_name: 'Bob Johnson', customer_phone: '555-0103', start_date: '2026-08-10', end_date: '2026-08-15', total_amount: 500.00, status: 'ongoing' },
    { vehicle_id: vehicles[3].id, customer_name: 'Alice Brown', customer_phone: '555-0104', start_date: '2026-08-20', end_date: '2026-08-25', total_amount: 400.00, status: 'booked' },
    { vehicle_id: vehicles[4].id, customer_name: 'Charlie Wilson', customer_phone: '555-0105', start_date: '2026-07-01', end_date: '2026-07-05', total_amount: 225.00, status: 'completed' },
    { vehicle_id: vehicles[5].id, customer_name: 'Diana Lee', customer_phone: '555-0106', start_date: '2026-07-10', end_date: '2026-07-15', total_amount: 450.00, status: 'completed' },
    { vehicle_id: vehicles[6].id, customer_name: 'Edward Davis', customer_phone: '555-0107', start_date: '2026-07-20', end_date: '2026-07-25', total_amount: 425.00, status: 'completed' },
    { vehicle_id: vehicles[7].id, customer_name: 'Fiona Garcia', customer_phone: '555-0108', start_date: '2026-09-01', end_date: '2026-09-05', total_amount: 600.00, status: 'booked' },
    { vehicle_id: vehicles[8].id, customer_name: 'George Martinez', customer_phone: '555-0109', start_date: '2026-08-05', end_date: '2026-08-10', total_amount: 350.00, status: 'completed' },
    { vehicle_id: vehicles[9].id, customer_name: 'Helen Anderson', customer_phone: '555-0110', start_date: '2026-08-15', end_date: '2026-08-20', total_amount: 240.00, status: 'cancelled' },
    { vehicle_id: vehicles[0].id, customer_name: 'Ivan Thomas', customer_phone: '555-0111', start_date: '2026-08-25', end_date: '2026-08-30', total_amount: 250.00, status: 'booked' }
  ]);
}
```

- [ ] **Step 4:** Run `npx knex seed:run` — verify 3 staff, 10 vehicles, 11 rentals

- [ ] **Step 5:** Commit: `git add src/migrations src/seeds && git commit -m "feat: database migration and seed data"`

---

## Task 3: Types & Utilities

**Files:**
- Create: `src/types/index.ts`, `src/types/express.d.ts`, `src/utils/dateClipping.ts`

**Dependencies:** None

- [ ] **Step 1:** Create `src/types/index.ts`:
```typescript
export interface Staff {
  id: number; email: string; password_hash: string; name: string;
  created_at: Date; updated_at: Date;
}
export interface Vehicle {
  id: number; name: string; plate_number: string; category: string;
  daily_rate: number; photo_path: string | null; deleted_at: Date | null;
  created_at: Date; updated_at: Date;
}
export interface Rental {
  id: number; vehicle_id: number; customer_name: string; customer_phone: string;
  start_date: Date; end_date: Date; total_amount: number;
  status: 'booked' | 'ongoing' | 'completed' | 'cancelled';
  created_at: Date; updated_at: Date;
}
export interface CreateRentalInput {
  vehicle_id: number; customer_name: string; customer_phone: string;
  start_date: string; end_date: string;
}
export interface PaginationParams { page: number; limit: number; }
export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number; };
}
export interface ReportVehicle {
  id: number; name: string; total_bookings: number; days_rented: number; revenue: number;
}
export interface ReportResponse {
  vehicles: ReportVehicle[];
  top_vehicle: ReportVehicle | null;
}
```

- [ ] **Step 2:** Create `src/types/express.d.ts`:
```typescript
import { Staff } from './index';
declare global {
  namespace Express {
    interface Request {
      staff?: Pick<Staff, 'id' | 'email' | 'name'>;
    }
  }
}
```

- [ ] **Step 3:** Create `src/utils/dateClipping.ts`:
```typescript
export function getMonthRange(month: string): { start: string; end: string } {
  const [year, m] = month.split('-').map(Number);
  const start = `${year}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const end = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}
export function calculateDaysRented(start: string, end: string, monthStart: string, monthEnd: string): number {
  const clippedStart = start < monthStart ? monthStart : start;
  const clippedEnd = end > monthEnd ? monthEnd : end;
  const startMs = new Date(clippedStart).getTime();
  const endMs = new Date(clippedEnd).getTime();
  return Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
}
```

- [ ] **Step 4:** Commit: `git add src/types src/utils && git commit -m "feat: TypeScript types and date utility"`

---

## Task 4: Middleware

**Files:**
- Create: `src/middleware/errorHandler.ts`, `src/middleware/validate.ts`, `src/middleware/authenticate.ts`

**Dependencies:** Task 1 (config), Task 3 (types)

- [ ] **Step 1:** Create `src/middleware/errorHandler.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err.stack);
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err.message.includes('already booked')) {
    res.status(409).json({ error: err.message });
    return;
  }
  if (err.message === 'Not found') {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
}
```

- [ ] **Step 2:** Create `src/middleware/validate.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      res.status(400).json({ error: 'Validation failed', details: error.details });
      return;
    }
    req.body = value;
    next();
  };
}
```

- [ ] **Step 3:** Create `src/middleware/authenticate.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
interface TokenPayload { staffId: number; email: string; type: 'access' | 'refresh'; }
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const accessToken = req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;
  if (accessToken) {
    try {
      const payload = jwt.verify(accessToken, config.jwt.secret) as TokenPayload;
      req.staff = { id: payload.staffId, email: payload.email, name: '' };
      next();
      return;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError && refreshToken) {
        try {
          const refreshPayload = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;
          const newAccessToken = jwt.sign(
            { staffId: refreshPayload.staffId, email: refreshPayload.email, type: 'access' },
            config.jwt.secret,
            { expiresIn: config.jwt.accessExpiry }
          );
          res.cookie('accessToken', newAccessToken, {
            httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'strict', maxAge: 3600000
          });
          req.staff = { id: refreshPayload.staffId, email: refreshPayload.email, name: '' };
          next();
          return;
        } catch { /* fall through */ }
      }
    }
  }
  res.status(401).json({ error: 'Authentication required' });
}
```

- [ ] **Step 4:** Commit: `git add src/middleware && git commit -m "feat: authentication, validation, and error handling middleware"`

---

## Task 5: Validators

**Files:**
- Create: `src/validators/auth.validator.ts`, `src/validators/vehicle.validator.ts`, `src/validators/rental.validator.ts`

**Dependencies:** None

- [ ] **Step 1:** Create `src/validators/auth.validator.ts`:
```typescript
import Joi from 'joi';
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});
```

- [ ] **Step 2:** Create `src/validators/vehicle.validator.ts`:
```typescript
import Joi from 'joi';
export const createVehicleSchema = Joi.object({
  name: Joi.string().max(255).required(),
  plate_number: Joi.string().max(50).required(),
  category: Joi.string().max(100).required(),
  daily_rate: Joi.number().positive().precision(2).required()
});
export const updateVehicleSchema = Joi.object({
  name: Joi.string().max(255),
  plate_number: Joi.string().max(50),
  category: Joi.string().max(100),
  daily_rate: Joi.number().positive().precision(2)
}).min(1);
```

- [ ] **Step 3:** Create `src/validators/rental.validator.ts`:
```typescript
import Joi from 'joi';
export const createRentalSchema = Joi.object({
  vehicle_id: Joi.number().integer().positive().required(),
  customer_name: Joi.string().max(255).required(),
  customer_phone: Joi.string().max(50).required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required()
});
```

- [ ] **Step 4:** Commit: `git add src/validators && git commit -m "feat: Joi validation schemas"`

---

## Task 6: Staff Repository & Auth Service

**Files:**
- Create: `src/repositories/staff.repository.ts`, `src/services/auth.service.ts`

**Dependencies:** Task 3 (types), Task 4 (middleware)

- [ ] **Step 1:** Create `src/repositories/staff.repository.ts`:
```typescript
import db from '../config/database';
import { Staff } from '../types';
export class StaffRepository {
  async findByEmail(email: string): Promise<Staff | undefined> {
    return db('staff').where({ email }).first();
  }
  async findById(id: number): Promise<Staff | undefined> {
    return db('staff').where({ id }).first();
  }
}
export const staffRepository = new StaffRepository();
```

- [ ] **Step 2:** Create `src/services/auth.service.ts`:
```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { staffRepository } from '../repositories/staff.repository';
export class AuthService {
  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const staff = await staffRepository.findByEmail(email);
    if (!staff) throw new Error('Invalid credentials');
    const valid = await bcrypt.compare(password, staff.password_hash);
    if (!valid) throw new Error('Invalid credentials');
    const accessToken = jwt.sign(
      { staffId: staff.id, email: staff.email, type: 'access' },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiry }
    );
    const refreshToken = jwt.sign(
      { staffId: staff.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry }
    );
    return { accessToken, refreshToken };
  }
}
export const authService = new AuthService();
```

- [ ] **Step 3:** Commit: `git add src/repositories/staff.repository.ts src/services/auth.service.ts && git commit -m "feat: staff repository and auth service"`

---

## Task 7: Auth Controller & Routes

**Files:**
- Create: `src/controllers/auth.controller.ts`, `src/routes/auth.routes.ts`
- Modify: `src/app.ts` (add routes)

**Dependencies:** Task 4 (middleware), Task 5 (validators), Task 6 (auth service)

- [ ] **Step 1:** Create `src/controllers/auth.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { config } from '../config/env';
export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const { accessToken, refreshToken } = await authService.login(email, password);
    res.cookie('accessToken', accessToken, {
      httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'strict', maxAge: 3600000
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'strict', maxAge: 604800000
    });
    res.json({ message: 'Logged in' });
  }
  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  }
  async refresh(req: Request, res: Response): Promise<void> {
    // Handled by authenticate middleware, but explicit endpoint for clarity
    res.json({ message: 'Token refreshed' });
  }
}
export const authController = new AuthController();
```

- [ ] **Step 2:** Create `src/routes/auth.routes.ts`:
```typescript
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema } from '../validators/auth.validator';
const router = Router();
router.post('/login', validate(loginSchema), (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
export default router;
```

- [ ] **Step 3:** Update `src/app.ts` to mount routes:
```typescript
import authRoutes from './routes/auth.routes';
// Add before errorHandler:
app.use('/auth', authRoutes);
```

- [ ] **Step 4:** Test: `curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"admin@rental.com","password":"password123"}'`
Expected: `{ "message": "Logged in" }` with Set-Cookie headers

- [ ] **Step 5:** Commit: `git add src/controllers/auth.controller.ts src/routes/auth.routes.ts src/app.ts && git commit -m "feat: auth endpoints with JWT cookie login"`

---

## Task 8: Vehicle Repository

**Files:**
- Create: `src/repositories/vehicle.repository.ts`

**Dependencies:** Task 3 (types)

- [ ] **Step 1:** Create `src/repositories/vehicle.repository.ts`:
```typescript
import db from '../config/database';
import { Vehicle, PaginationParams } from '../types';
export class VehicleRepository {
  async findAll(params: PaginationParams, filters: { category?: string; search?: string }): Promise<{ data: Vehicle[]; total: number }> {
    let query = db('vehicles').whereNull('deleted_at');
    let countQuery = db('vehicles').whereNull('deleted_at');
    if (filters.category) {
      query = query.where('category', filters.category);
      countQuery = countQuery.where('category', filters.category);
    }
    if (filters.search) {
      query = query.where('name', 'ilike', `%${filters.search}%`);
      countQuery = countQuery.where('name', 'ilike', `%${filters.search}%`);
    }
    const total = (await countQuery.count('* as count').first())?.count || 0;
    const data = await query
      .orderBy('created_at', 'desc')
      .offset((params.page - 1) * params.limit)
      .limit(params.limit);
    return { data, total: Number(total) };
  }
  async findById(id: number): Promise<Vehicle | undefined> {
    return db('vehicles').where({ id }).whereNull('deleted_at').first();
  }
  async create(data: Partial<Vehicle>): Promise<Vehicle> {
    const [result] = await db('vehicles').insert(data).returning('*');
    return result;
  }
  async update(id: number, data: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const [result] = await db('vehicles').where({ id }).update({ ...data, updated_at: new Date() }).returning('*');
    return result;
  }
  async softDelete(id: number): Promise<boolean> {
    const count = await db('vehicles').where({ id }).update({ deleted_at: new Date() });
    return count > 0;
  }
}
export const vehicleRepository = new VehicleRepository();
```

- [ ] **Step 2:** Commit: `git add src/repositories/vehicle.repository.ts && git commit -m "feat: vehicle repository with CRUD and soft delete"`

---

## Task 9: Vehicle Service & Controller

**Files:**
- Create: `src/services/vehicle.service.ts`, `src/controllers/vehicle.controller.ts`

**Dependencies:** Task 8 (vehicle repository), Task 5 (validators)

- [ ] **Step 1:** Create `src/services/vehicle.service.ts`:
```typescript
import { vehicleRepository } from '../repositories/vehicle.repository';
import { Vehicle, PaginationParams } from '../types';
import fs from 'fs';
import path from 'path';
export class VehicleService {
  async getAll(params: PaginationParams, filters: { category?: string; search?: string }) {
    return vehicleRepository.findAll(params, filters);
  }
  async getById(id: number): Promise<Vehicle> {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) throw new Error('Not found');
    return vehicle;
  }
  async create(data: Partial<Vehicle>, file?: Express.Multer.File): Promise<Vehicle> {
    if (file) data.photo_path = file.path;
    return vehicleRepository.create(data);
  }
  async update(id: number, data: Partial<Vehicle>, file?: Express.Multer.File): Promise<Vehicle> {
    const existing = await vehicleRepository.findById(id);
    if (!existing) throw new Error('Not found');
    if (file && existing.photo_path) {
      fs.unlinkSync(existing.photo_path);
    }
    if (file) data.photo_path = file.path;
    const updated = await vehicleRepository.update(id, data);
    if (!updated) throw new Error('Not found');
    return updated;
  }
  async delete(id: number): Promise<void> {
    const deleted = await vehicleRepository.softDelete(id);
    if (!deleted) throw new Error('Not found');
  }
}
export const vehicleService = new VehicleService();
```

- [ ] **Step 2:** Create `src/controllers/vehicle.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { vehicleService } from '../services/vehicle.service';
export class VehicleController {
  async getAll(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const category = req.query.category as string;
    const search = req.query.search as string;
    const result = await vehicleService.getAll({ page, limit }, { category, search });
    res.json({
      data: result.data,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
    });
  }
  async getById(req: Request, res: Response): Promise<void> {
    const vehicle = await vehicleService.getById(parseInt(req.params.id));
    res.json({ data: vehicle });
  }
  async create(req: Request, res: Response): Promise<void> {
    const vehicle = await vehicleService.create(req.body, req.file);
    res.status(201).json({ data: vehicle });
  }
  async update(req: Request, res: Response): Promise<void> {
    const vehicle = await vehicleService.update(parseInt(req.params.id), req.body, req.file);
    res.json({ data: vehicle });
  }
  async delete(req: Request, res: Response): Promise<void> {
    await vehicleService.delete(parseInt(req.params.id));
    res.json({ message: 'Vehicle deleted' });
  }
}
export const vehicleController = new VehicleController();
```

- [ ] **Step 3:** Commit: `git add src/services/vehicle.service.ts src/controllers/vehicle.controller.ts && git commit -m "feat: vehicle service and controller"`

---

## Task 10: Vehicle Routes

**Files:**
- Create: `src/routes/vehicle.routes.ts`
- Modify: `src/app.ts` (mount vehicle routes)

**Dependencies:** Task 7 (auth middleware), Task 9 (vehicle controller), Task 5 (validators)

- [ ] **Step 1:** Create `src/routes/vehicle.routes.ts`:
```typescript
import { Router } from 'express';
import multer from 'multer';
import { vehicleController } from '../controllers/vehicle.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createVehicleSchema, updateVehicleSchema } from '../validators/vehicle.validator';
import { config } from '../config/env';
const upload = multer({
  dest: config.uploadPath,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP allowed'));
  }
});
const router = Router();
router.use(authenticate);
router.get('/', (req, res) => vehicleController.getAll(req, res));
router.get('/:id', (req, res) => vehicleController.getById(req, res));
router.post('/', upload.single('photo'), validate(createVehicleSchema), (req, res) => vehicleController.create(req, res));
router.put('/:id', upload.single('photo'), validate(updateVehicleSchema), (req, res) => vehicleController.update(req, res));
router.delete('/:id', (req, res) => vehicleController.delete(req, res));
export default router;
```

- [ ] **Step 2:** Update `src/app.ts`:
```typescript
import vehicleRoutes from './routes/vehicle.routes';
// Add after auth routes:
app.use('/vehicles', vehicleRoutes);
```

- [ ] **Step 3:** Test: `curl http://localhost:3000/vehicles` (with cookie from login)
Expected: Paginated vehicle list

- [ ] **Step 4:** Commit: `git add src/routes/vehicle.routes.ts src/app.ts && git commit -m "feat: vehicle CRUD endpoints"`

---

## Task 11: Rental Repository

**Files:**
- Create: `src/repositories/rental.repository.ts`

**Dependencies:** Task 3 (types)

- [ ] **Step 1:** Create `src/repositories/rental.repository.ts`:
```typescript
import db from '../config/database';
import { Rental, PaginationParams } from '../types';
export class RentalRepository {
  async findAll(params: PaginationParams, filters: { vehicle_id?: number; status?: string; start?: string; end?: string }): Promise<{ data: Rental[]; total: number }> {
    let query = db('rentals');
    let countQuery = db('rentals');
    if (filters.vehicle_id) {
      query = query.where('vehicle_id', filters.vehicle_id);
      countQuery = countQuery.where('vehicle_id', filters.vehicle_id);
    }
    if (filters.status) {
      query = query.where('status', filters.status);
      countQuery = countQuery.where('status', filters.status);
    }
    if (filters.start) {
      query = query.where('start_date', '>=', filters.start);
      countQuery = countQuery.where('start_date', '>=', filters.start);
    }
    if (filters.end) {
      query = query.where('end_date', '<=', filters.end);
      countQuery = countQuery.where('end_date', '<=', filters.end);
    }
    const total = (await countQuery.count('* as count').first())?.count || 0;
    const data = await query.orderBy('created_at', 'desc').offset((params.page - 1) * params.limit).limit(params.limit);
    return { data, total: Number(total) };
  }
  async findById(id: number): Promise<Rental | undefined> {
    return db('rentals').where({ id }).first();
  }
  async findOverlapping(vehicleId: number, startDate: string, endDate: string, excludeId?: number): Promise<Rental | undefined> {
    let query = db('rentals')
      .where('vehicle_id', vehicleId)
      .whereIN('status', ['booked', 'ongoing'])
      .where('start_date', '<=', endDate)
      .where('end_date', '>=', startDate);
    if (excludeId) query = query.whereNot('id', excludeId);
    return query.first();
  }
  async create(data: Partial<Rental>): Promise<Rental> {
    const [result] = await db('rentals').insert(data).returning('*');
    return result;
  }
  async update(id: number, data: Partial<Rental>): Promise<Rental | undefined> {
    const [result] = await db('rentals').where({ id }).update({ ...data, updated_at: new Date() }).returning('*');
    return result;
  }
  async delete(id: number): Promise<boolean> {
    const count = await db('rentals').where({ id }).del();
    return count > 0;
  }
  async getMonthlyReport(month: string, vehicleId?: number): Promise<any[]> {
    const [year, m] = month.split('-').map(Number);
    const monthStart = `${year}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const monthEnd = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    let query = db('vehicles as v')
      .join('rentals as r', 'r.vehicle_id', 'v.id')
      .where('r.status', 'in', ['booked', 'ongoing', 'completed'])
      .where('r.start_date', '<=', monthEnd)
      .where('r.end_date', '>=', monthStart)
      .select(
        'v.id', 'v.name',
        db.raw('COUNT(r.id)::int AS total_bookings'),
        db.raw(`SUM((EXTRACT(DAY FROM (LEAST(r.end_date, ?::date) - GREATEST(r.start_date, ?::date))) + 1))::int AS days_rented`, [monthEnd, monthStart]),
        db.raw(`SUM((EXTRACT(DAY FROM (LEAST(r.end_date, ?::date) - GREATEST(r.start_date, ?::date))) + 1) * v.daily_rate)::numeric(10,2) AS revenue`, [monthEnd, monthStart])
      )
      .groupBy('v.id', 'v.name')
      .orderBy('revenue', 'desc');
    if (vehicleId) query = query.where('v.id', vehicleId);
    return query;
  }
}
export const rentalRepository = new RentalRepository();
```

- [ ] **Step 2:** Commit: `git add src/repositories/rental.repository.ts && git commit -m "feat: rental repository with overlap check and report query"`

---

## Task 12: Rental Service

**Files:**
- Create: `src/services/rental.service.ts`

**Dependencies:** Task 11 (rental repository), Task 8 (vehicle repository), Task 3 (types)

- [ ] **Step 1:** Create `src/services/rental.service.ts`:
```typescript
import { rentalRepository } from '../repositories/rental.repository';
import { vehicleRepository } from '../repositories/vehicle.repository';
import db from '../config/database';
import { CreateRentalInput, PaginationParams } from '../types';
export class RentalService {
  async getAll(params: PaginationParams, filters: { vehicle_id?: number; status?: string; start?: string; end?: string }) {
    return rentalRepository.findAll(params, filters);
  }
  async getById(id: number) {
    const rental = await rentalRepository.findById(id);
    if (!rental) throw new Error('Not found');
    return rental;
  }
  async create(input: CreateRentalInput) {
    const vehicle = await vehicleRepository.findById(input.vehicle_id);
    if (!vehicle) throw new Error('Vehicle not found');
    return db.transaction(async (trx) => {
      await trx('vehicles').where({ id: input.vehicle_id }).forUpdate();
      const overlap = await rentalRepository.findOverlapping(input.vehicle_id, input.start_date, input.end_date);
      if (overlap) {
        const err = new Error('Vehicle already booked for these dates');
        (err as any).conflicting_rental_id = overlap.id;
        throw err;
      }
      const days = Math.ceil((new Date(input.end_date).getTime() - new Date(input.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const total_amount = days * Number(vehicle.daily_rate);
      return rentalRepository.create({ ...input, total_amount, status: 'booked' });
    });
  }
  async update(id: number, input: Partial<CreateRentalInput>) {
    const existing = await rentalRepository.findById(id);
    if (!existing) throw new Error('Not found');
    const vehicleId = input.vehicle_id || existing.vehicle_id;
    const startDate = input.start_date || existing.start_date as unknown as string;
    const endDate = input.end_date || existing.end_date as unknown as string;
    return db.transaction(async (trx) => {
      await trx('vehicles').where({ id: vehicleId }).forUpdate();
      const overlap = await rentalRepository.findOverlapping(vehicleId, startDate, endDate, id);
      if (overlap) {
        const err = new Error('Vehicle already booked for these dates');
        (err as any).conflicting_rental_id = overlap.id;
        throw err;
      }
      let total_amount = existing.total_amount;
      if (input.start_date || input.end_date) {
        const vehicle = await vehicleRepository.findById(vehicleId);
        const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        total_amount = days * Number(vehicle!.daily_rate);
      }
      return rentalRepository.update(id, { ...input, total_amount } as any);
    });
  }
  async delete(id: number) {
    const deleted = await rentalRepository.delete(id);
    if (!deleted) throw new Error('Not found');
  }
}
export const rentalService = new RentalService();
```

- [ ] **Step 2:** Commit: `git add src/services/rental.service.ts && git commit -m "feat: rental service with overlap check in transaction"`

---

## Task 13: Rental Controller & Routes

**Files:**
- Create: `src/controllers/rental.controller.ts`, `src/routes/rental.routes.ts`
- Modify: `src/app.ts` (mount rental routes)

**Dependencies:** Task 12 (rental service), Task 7 (auth middleware), Task 5 (validators)

- [ ] **Step 1:** Create `src/controllers/rental.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { rentalService } from '../services/rental.service';
export class RentalController {
  async getAll(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const vehicle_id = req.query.vehicle_id ? parseInt(req.query.vehicle_id as string) : undefined;
    const status = req.query.status as string;
    const start = req.query.start as string;
    const end = req.query.end as string;
    const result = await rentalService.getAll({ page, limit }, { vehicle_id, status, start, end });
    res.json({
      data: result.data,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
    });
  }
  async getById(req: Request, res: Response): Promise<void> {
    const rental = await rentalService.getById(parseInt(req.params.id));
    res.json({ data: rental });
  }
  async create(req: Request, res: Response): Promise<void> {
    try {
      const rental = await rentalService.create(req.body);
      res.status(201).json({ data: rental });
    } catch (err: any) {
      if (err.message === 'Vehicle already booked for these dates') {
        res.status(409).json({ error: err.message, conflicting_rental_id: err.conflicting_rental_id });
        return;
      }
      throw err;
    }
  }
  async update(req: Request, res: Response): Promise<void> {
    try {
      const rental = await rentalService.update(parseInt(req.params.id), req.body);
      res.json({ data: rental });
    } catch (err: any) {
      if (err.message === 'Vehicle already booked for these dates') {
        res.status(409).json({ error: err.message, conflicting_rental_id: err.conflicting_rental_id });
        return;
      }
      throw err;
    }
  }
  async delete(req: Request, res: Response): Promise<void> {
    await rentalService.delete(parseInt(req.params.id));
    res.json({ message: 'Rental deleted' });
  }
}
export const rentalController = new RentalController();
```

- [ ] **Step 2:** Create `src/routes/rental.routes.ts`:
```typescript
import { Router } from 'express';
import { rentalController } from '../controllers/rental.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createRentalSchema } from '../validators/rental.validator';
const router = Router();
router.use(authenticate);
router.get('/', (req, res) => rentalController.getAll(req, res));
router.get('/:id', (req, res) => rentalController.getById(req, res));
router.post('/', validate(createRentalSchema), (req, res) => rentalController.create(req, res));
router.put('/:id', validate(createRentalSchema), (req, res) => rentalController.update(req, res));
router.delete('/:id', (req, res) => rentalController.delete(req, res));
export default router;
```

- [ ] **Step 3:** Update `src/app.ts`:
```typescript
import rentalRoutes from './routes/rental.routes';
// Add after vehicle routes:
app.use('/rentals', rentalRoutes);
```

- [ ] **Step 4:** Test: Create rental, try overlapping (expect 409), verify report

- [ ] **Step 5:** Commit: `git add src/controllers/rental.controller.ts src/routes/rental.routes.ts src/app.ts && git commit -m "feat: rental CRUD endpoints with overlap prevention"`

---

## Task 14: Report Service & Controller

**Files:**
- Create: `src/services/report.service.ts`, `src/controllers/report.controller.ts`, `src/routes/report.routes.ts`
- Modify: `src/app.ts` (mount report routes)

**Dependencies:** Task 11 (rental repository for report query)

- [ ] **Step 1:** Create `src/services/report.service.ts`:
```typescript
import { rentalRepository } from '../repositories/rental.repository';
export class ReportService {
  async getMonthlyReport(month: string, vehicleId?: number) {
    const vehicles = await rentalRepository.getMonthlyReport(month, vehicleId);
    const top_vehicle = vehicles.length > 0 ? vehicles[0] : null;
    return { vehicles, top_vehicle };
  }
}
export const reportService = new ReportService();
```

- [ ] **Step 2:** Create `src/controllers/report.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { reportService } from '../services/report.service';
export class ReportController {
  async getMonthlyReport(req: Request, res: Response): Promise<void> {
    const month = req.query.month as string;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
      return;
    }
    const vehicle_id = req.query.vehicle_id ? parseInt(req.query.vehicle_id as string) : undefined;
    const report = await reportService.getMonthlyReport(month, vehicle_id);
    res.json({ data: report });
  }
}
export const reportController = new ReportController();
```

- [ ] **Step 3:** Create `src/routes/report.routes.ts`:
```typescript
import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/authenticate';
const router = Router();
router.use(authenticate);
router.get('/rentals', (req, res) => reportController.getMonthlyReport(req, res));
export default router;
```

- [ ] **Step 4:** Update `src/app.ts`:
```typescript
import reportRoutes from './routes/report.routes';
// Add after rental routes:
app.use('/reports', reportRoutes);
```

- [ ] **Step 5:** Test: `curl "http://localhost:3000/reports/rentals?month=2026-08"` (with cookie)
Expected: Vehicle list with bookings, days_rented, revenue; top_vehicle with highest revenue

- [ ] **Step 6:** Commit: `git add src/services/report.service.ts src/controllers/report.controller.ts src/routes/report.routes.ts src/app.ts && git commit -m "feat: monthly rental report endpoint"`

---

## Task 15: OpenAPI Documentation

**Files:**
- Create: `src/docs/openapi.ts`
- Modify: `src/app.ts` (mount Scalar UI)

**Dependencies:** All endpoints defined

- [ ] **Step 1:** Create `src/docs/openapi.ts`:
```typescript
export const openapiSpec = {
  openapi: '3.0.0',
  info: { title: 'Vehicle Rental API', version: '1.0.0', description: 'REST API for vehicle rental management' },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'accessToken' }
    },
    schemas: {
      Staff: { type: 'object', properties: { id: { type: 'integer' }, email: { type: 'string' }, name: { type: 'string' } } },
      Vehicle: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, plate_number: { type: 'string' }, category: { type: 'string' }, daily_rate: { type: 'number' }, photo_path: { type: 'string', nullable: true } } },
      Rental: { type: 'object', properties: { id: { type: 'integer' }, vehicle_id: { type: 'integer' }, customer_name: { type: 'string' }, customer_phone: { type: 'string' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, total_amount: { type: 'number' }, status: { type: 'string', enum: ['booked', 'ongoing', 'completed', 'cancelled'] } } },
      Error: { type: 'object', properties: { error: { type: 'string' }, details: { type: 'array', items: { type: 'object' } } } },
      Pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } }
    }
  },
  paths: {
    '/auth/login': { post: { tags: ['Auth'], summary: 'Login', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] } } } }, responses: { '200': { description: 'Logged in' }, '401': { description: 'Invalid credentials' } } } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Logout', responses: { '200': { description: 'Logged out' } } } },
    '/vehicles': {
      get: { tags: ['Vehicles'], summary: 'List vehicles', security: [{ cookieAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }, { name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated vehicles' }, '401': { description: 'Unauthorized' } } },
      post: { tags: ['Vehicles'], summary: 'Create vehicle', security: [{ cookieAuth: [] }], requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { name: { type: 'string' }, plate_number: { type: 'string' }, category: { type: 'string' }, daily_rate: { type: 'number' }, photo: { type: 'string', format: 'binary' } }, required: ['name', 'plate_number', 'category', 'daily_rate'] } } } }, responses: { '201': { description: 'Created' }, '400': { description: 'Validation error' } } }
    },
    '/vehicles/{id}': {
      get: { tags: ['Vehicles'], summary: 'Get vehicle', security: [{ cookieAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Vehicle' }, '404': { description: 'Not found' } } },
      put: { tags: ['Vehicles'], summary: 'Update vehicle', security: [{ cookieAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['Vehicles'], summary: 'Delete vehicle', security: [{ cookieAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Deleted' } } }
    },
    '/rentals': {
      get: { tags: ['Rentals'], summary: 'List rentals', security: [{ cookieAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'vehicle_id', in: 'query', schema: { type: 'integer' } }, { name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'start', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'end', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { '200': { description: 'Paginated rentals' } } },
      post: { tags: ['Rentals'], summary: 'Create rental', security: [{ cookieAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { vehicle_id: { type: 'integer' }, customer_name: { type: 'string' }, customer_phone: { type: 'string' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' } }, required: ['vehicle_id', 'customer_name', 'customer_phone', 'start_date', 'end_date'] } } } }, responses: { '201': { description: 'Created' }, '409': { description: 'Overlapping rental' } } }
    },
    '/rentals/{id}': {
      get: { tags: ['Rentals'], summary: 'Get rental', security: [{ cookieAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Rental' } } },
      put: { tags: ['Rentals'], summary: 'Update rental', security: [{ cookieAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Updated' }, '409': { description: 'Overlapping rental' } } },
      delete: { tags: ['Rentals'], summary: 'Delete rental', security: [{ cookieAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Deleted' } } }
    },
    '/reports/rentals': { get: { tags: ['Reports'], summary: 'Monthly rental report', security: [{ cookieAuth: [] }], parameters: [{ name: 'month', in: 'query', required: true, schema: { type: 'string', example: '2026-08' } }, { name: 'vehicle_id', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Report data' } } } }
  }
};
```

- [ ] **Step 2:** Update `src/app.ts` to serve Scalar UI:
```typescript
import { reference } from '@scalar/express-api-reference';
import { openapiSpec } from './docs/openapi';
// Add before errorHandler:
app.use('/docs', reference({ spec: openapiSpec }));
```

- [ ] **Step 3:** Visit `http://localhost:3000/docs` — verify interactive API docs

- [ ] **Step 4:** Commit: `git add src/docs/openapi.ts src/app.ts && git commit -m "feat: OpenAPI documentation with Scalar UI"`

---

## Task 16: Testing Setup

**Files:**
- Create: `tests/setup.ts`, `jest.config.js`

**Dependencies:** Task 1 (project setup)

- [ ] **Step 1:** Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/types/**', '!src/docs/**'],
  setupFilesAfterSetup: ['<rootDir>/tests/setup.ts']
};
```

- [ ] **Step 2:** Create `tests/setup.ts`:
```typescript
import knex from 'knex';
import knexConfig from '../knexfile';
process.env.NODE_ENV = 'test';
const db = knex(knexConfig.test);
beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
});
afterAll(async () => {
  await db.destroy();
});
export { db };
```

- [ ] **Step 3:** Commit: `git add tests/setup.ts jest.config.js && git commit -m "feat: test setup with Jest and test database"`

---

## Task 17: Auth Integration Tests

**Files:**
- Create: `tests/integration/auth.test.ts`

**Dependencies:** Task 7 (auth endpoints), Task 16 (test setup)

- [ ] **Step 1:** Create `tests/integration/auth.test.ts`:
```typescript
import request from 'supertest';
import app from '../../src/app';
describe('Auth Endpoints', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@rental.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged in');
    expect(res.headers['set-cookie']).toBeDefined();
  });
  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@rental.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
  it('should logout and clear cookies', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@rental.com', password: 'password123' });
    const cookie = loginRes.headers['set-cookie'];
    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
  });
});
```

- [ ] **Step 2:** Run `npx jest tests/integration/auth.test.ts` — all tests pass

- [ ] **Step 3:** Commit: `git add tests/integration/auth.test.ts && git commit -m "test: auth integration tests"`

---

## Task 18: Vehicle Integration Tests

**Files:**
- Create: `tests/integration/vehicles.test.ts`

**Dependencies:** Task 10 (vehicle endpoints), Task 16 (test setup)

- [ ] **Step 1:** Create `tests/integration/vehicles.test.ts`:
```typescript
import request from 'supertest';
import app from '../../src/app';
let cookie: string[];
beforeAll(async () => {
  const loginRes = await request(app).post('/auth/login').send({ email: 'admin@rental.com', password: 'password123' });
  cookie = loginRes.headers['set-cookie'];
});
describe('Vehicle Endpoints', () => {
  it('should list vehicles with pagination', async () => {
    const res = await request(app).get('/vehicles').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });
  it('should filter by category', async () => {
    const res = await request(app).get('/vehicles?category=Sedan').set('Cookie', cookie);
    expect(res.status).toBe(200);
    res.body.data.forEach((v: any) => expect(v.category).toBe('Sedan'));
  });
  it('should get vehicle by id', async () => {
    const res = await request(app).get('/vehicles/1').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(1);
  });
  it('should return 404 for non-existent vehicle', async () => {
    const res = await request(app).get('/vehicles/9999').set('Cookie', cookie);
    expect(res.status).toBe(404);
  });
  it('should create vehicle', async () => {
    const res = await request(app)
      .post('/vehicles')
      .set('Cookie', cookie)
      .field('name', 'Test Car')
      .field('plate_number', 'TEST-0001')
      .field('category', 'Sedan')
      .field('daily_rate', '55.00');
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Car');
  });
  it('should soft delete vehicle', async () => {
    const createRes = await request(app)
      .post('/vehicles')
      .set('Cookie', cookie)
      .field('name', 'Delete Me')
      .field('plate_number', 'DEL-0001')
      .field('category', 'Sedan')
      .field('daily_rate', '40.00');
    const id = createRes.body.data.id;
    const res = await request(app).delete(`/vehicles/${id}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    const getRes = await request(app).get(`/vehicles/${id}`).set('Cookie', cookie);
    expect(getRes.status).toBe(404);
  });
});
```

- [ ] **Step 2:** Run `npx jest tests/integration/vehicles.test.ts` — all tests pass

- [ ] **Step 3:** Commit: `git add tests/integration/vehicles.test.ts && git commit -m "test: vehicle integration tests"`

---

## Task 19: Rental Integration Tests

**Files:**
- Create: `tests/integration/rentals.test.ts`

**Dependencies:** Task 13 (rental endpoints), Task 16 (test setup)

- [ ] **Step 1:** Create `tests/integration/rentals.test.ts`:
```typescript
import request from 'supertest';
import app from '../../src/app';
let cookie: string[];
beforeAll(async () => {
  const loginRes = await request(app).post('/auth/login').send({ email: 'admin@rental.com', password: 'password123' });
  cookie = loginRes.headers['set-cookie'];
});
describe('Rental Endpoints', () => {
  it('should list rentals', async () => {
    const res = await request(app).get('/rentals').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
  it('should create rental', async () => {
    const res = await request(app)
      .post('/rentals')
      .set('Cookie', cookie)
      .send({ vehicle_id: 5, customer_name: 'Test Customer', customer_phone: '555-9999', start_date: '2026-10-01', end_date: '2026-10-05' });
    expect(res.status).toBe(201);
    expect(res.body.data.total_amount).toBe(225.00); // 5 days * 45
  });
  it('should return 409 for overlapping rental', async () => {
    await request(app).post('/rentals').set('Cookie', cookie)
      .send({ vehicle_id: 5, customer_name: 'First', customer_phone: '555-0001', start_date: '2026-11-01', end_date: '2026-11-05' });
    const res = await request(app).post('/rentals').set('Cookie', cookie)
      .send({ vehicle_id: 5, customer_name: 'Second', customer_phone: '555-0002', start_date: '2026-11-03', end_date: '2026-11-07' });
    expect(res.status).toBe(409);
    expect(res.body.conflicting_rental_id).toBeDefined();
  });
  it('should get report for month', async () => {
    const res = await request(app).get('/reports/rentals?month=2026-08').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.vehicles).toBeInstanceOf(Array);
    expect(res.body.data.top_vehicle).toBeDefined();
  });
});
```

- [ ] **Step 2:** Run `npx jest tests/integration/rentals.test.ts` — all tests pass

- [ ] **Step 3:** Commit: `git add tests/integration/rentals.test.ts && git commit -m "test: rental integration tests with overlap and report"`

---

## Task 20: README & Final Cleanup

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

**Dependencies:** All tasks complete

- [ ] **Step 1:** Update `README.md`:
```markdown
# Rent a Car — Vehicle Rental Management API

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and configure
3. Run `docker-compose up -d db`
4. Run `npm install`
5. Run `npx knex migrate:latest && npx knex seed:run`
6. Run `npm run dev`

## API Documentation

Visit `http://localhost:3000/docs` for interactive API docs (Scalar UI).

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Endpoints

- `POST /auth/login` — Login (returns httpOnly cookies)
- `POST /auth/logout` — Logout
- `GET /vehicles` — List vehicles (paginated, filterable)
- `POST /vehicles` — Create vehicle (multipart)
- `GET /rentals` — List rentals (filterable)
- `POST /rentals` — Create rental (overlap check)
- `GET /reports/rentals?month=YYYY-MM` — Monthly report
```

- [ ] **Step 2:** Update `.gitignore`:
```
node_modules/
dist/
.env
uploads/
coverage/
*.log
```

- [ ] **Step 3:** Run lint and format:
```bash
npm run lint:fix && npm run format
```

- [ ] **Step 4:** Commit: `git add -A && git commit -m "docs: README and gitignore setup"`

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Project setup & Docker | 12 files |
| 2 | Database migration & seed | 2 files |
| 3 | Types & utilities | 3 files |
| 4 | Middleware | 3 files |
| 5 | Validators | 3 files |
| 6 | Staff repo & auth service | 2 files |
| 7 | Auth controller & routes | 2 files + app.ts |
| 8 | Vehicle repository | 1 file |
| 9 | Vehicle service & controller | 2 files |
| 10 | Vehicle routes | 1 file + app.ts |
| 11 | Rental repository | 1 file |
| 12 | Rental service | 1 file |
| 13 | Rental controller & routes | 2 files + app.ts |
| 14 | Report service, controller, routes | 3 files + app.ts |
| 15 | OpenAPI documentation | 1 file + app.ts |
| 16 | Testing setup | 2 files |
| 17 | Auth integration tests | 1 file |
| 18 | Vehicle integration tests | 1 file |
| 19 | Rental integration tests | 1 file |
| 20 | README & cleanup | 2 files |

**Total:** ~45 files, ~20 tasks
