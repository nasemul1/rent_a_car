import { Request, Response } from 'express';
import { reportService } from '../services/report.service';

export class ReportController {
  async getMonthlyReport(req: Request, res: Response): Promise<void> {
    const month = req.query.month as string;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
      return;
    }

    const vehicle_id = req.query.vehicle_id
      ? parseInt(req.query.vehicle_id as string)
      : undefined;

    const report = await reportService.getMonthlyReport(month, vehicle_id);
    res.json({ data: report });
  }
}

export const reportController = new ReportController();
