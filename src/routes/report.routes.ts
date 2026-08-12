import { Router, NextFunction, Request, Response } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/authenticate';

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

const router = Router();

router.use(authenticate);

router.get('/rentals', asyncHandler((req, res) => reportController.getMonthlyReport(req, res)));

export default router;
