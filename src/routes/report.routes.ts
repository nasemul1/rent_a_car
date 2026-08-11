import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/rentals', (req, res) => reportController.getMonthlyReport(req, res));

export default router;
