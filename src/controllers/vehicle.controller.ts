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
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const vehicle = await vehicleService.getById(Number(req.params.id));
    res.json({ data: vehicle });
  }

  async create(req: Request, res: Response): Promise<void> {
    const vehicle = await vehicleService.create(req.body, (req as any).file);
    res.status(201).json({ data: vehicle });
  }

  async update(req: Request, res: Response): Promise<void> {
    const vehicle = await vehicleService.update(Number(req.params.id), req.body, (req as any).file);
    res.json({ data: vehicle });
  }

  async delete(req: Request, res: Response): Promise<void> {
    await vehicleService.delete(Number(req.params.id));
    res.json({ message: 'Vehicle deleted' });
  }
}

export const vehicleController = new VehicleController();
