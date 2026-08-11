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
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const rental = await rentalService.getById(Number(req.params.id));
    res.json({ data: rental });
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const rental = await rentalService.create(req.body);
      res.status(201).json({ data: rental });
    } catch (err: any) {
      if (err.message === 'Vehicle already booked for these dates') {
        res.status(409).json({
          error: err.message,
          conflicting_rental_id: err.conflicting_rental_id,
        });
        return;
      }
      throw err;
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const rental = await rentalService.update(Number(req.params.id), req.body);
      res.json({ data: rental });
    } catch (err: any) {
      if (err.message === 'Vehicle already booked for these dates') {
        res.status(409).json({
          error: err.message,
          conflicting_rental_id: err.conflicting_rental_id,
        });
        return;
      }
      throw err;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    await rentalService.delete(Number(req.params.id));
    res.json({ message: 'Rental deleted' });
  }
}

export const rentalController = new RentalController();
