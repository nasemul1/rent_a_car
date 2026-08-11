import { vehicleRepository } from '../repositories/vehicle.repository';
import { Vehicle, PaginationParams } from '../types';
import fs from 'fs';

export class VehicleService {
  async getAll(params: PaginationParams, filters: { category?: string; search?: string }) {
    return vehicleRepository.findAll(params, filters);
  }

  async getById(id: number): Promise<Vehicle> {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) throw new Error('Not found');
    return vehicle;
  }

  async create(data: Partial<Vehicle>, file?: { path: string }): Promise<Vehicle> {
    if (file) data.photo_path = file.path;
    return vehicleRepository.create(data);
  }

  async update(id: number, data: Partial<Vehicle>, file?: { path: string }): Promise<Vehicle> {
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
