import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { apiReference } from '@scalar/express-api-reference';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import vehicleRoutes from './routes/vehicle.routes';
import rentalRoutes from './routes/rental.routes';
import reportRoutes from './routes/report.routes';
import { openapiSpec } from './docs/openapi';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/rentals', rentalRoutes);
app.use('/reports', reportRoutes);

app.use('/docs', apiReference({ spec: openapiSpec as any }));

app.use(errorHandler);

export default app;
