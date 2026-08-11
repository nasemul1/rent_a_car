import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import vehicleRoutes from './routes/vehicle.routes';

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

app.use(errorHandler);

export default app;
