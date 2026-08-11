import { rentalRepository } from '../repositories/rental.repository';
import { vehicleRepository } from '../repositories/vehicle.repository';
import db from '../config/database';
import { CreateRentalInput, PaginationParams } from '../types';

export class RentalService {
  async getAll(
    params: PaginationParams,
    filters: { vehicle_id?: number; status?: string; start?: string; end?: string },
  ) {
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

      const overlap = await rentalRepository.findOverlapping(
        input.vehicle_id,
        input.start_date,
        input.end_date,
      );

      if (overlap) {
        const err = new Error('Vehicle already booked for these dates');
        (err as any).conflicting_rental_id = overlap.id;
        throw err;
      }

      const days =
        Math.ceil(
          (new Date(input.end_date).getTime() - new Date(input.start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1;
      const total_amount = days * Number(vehicle.daily_rate);

      return rentalRepository.create({ ...input, total_amount, status: 'booked' } as any);
    });
  }

  async update(id: number, input: Partial<CreateRentalInput>) {
    const existing = await rentalRepository.findById(id);
    if (!existing) throw new Error('Not found');

    const vehicleId = input.vehicle_id || existing.vehicle_id;
    const startDate = input.start_date || (existing.start_date as unknown as string);
    const endDate = input.end_date || (existing.end_date as unknown as string);

    return db.transaction(async (trx) => {
      await trx('vehicles').where({ id: vehicleId }).forUpdate();

      const overlap = await rentalRepository.findOverlapping(
        vehicleId,
        startDate,
        endDate,
        id,
      );

      if (overlap) {
        const err = new Error('Vehicle already booked for these dates');
        (err as any).conflicting_rental_id = overlap.id;
        throw err;
      }

      let total_amount = existing.total_amount;
      if (input.start_date || input.end_date) {
        const vehicle = await vehicleRepository.findById(vehicleId);
        const days =
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;
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
