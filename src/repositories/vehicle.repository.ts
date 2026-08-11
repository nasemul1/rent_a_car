import db from '../config/database';
import { Vehicle, PaginationParams } from '../types';

export class VehicleRepository {
  async findAll(
    params: PaginationParams,
    filters: { category?: string; search?: string },
  ): Promise<{ data: Vehicle[]; total: number }> {
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

  async findByPlateNumber(plate_number: string): Promise<Vehicle | undefined> {
    return db('vehicles').where({ plate_number }).whereNull('deleted_at').first();
  }

  async create(data: Partial<Vehicle>): Promise<Vehicle> {
    const [result] = await db('vehicles').insert(data).returning('*');
    return result;
  }

  async update(id: number, data: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const [result] = await db('vehicles')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return result;
  }

  async softDelete(id: number): Promise<boolean> {
    const count = await db('vehicles').where({ id }).update({ deleted_at: new Date() });
    return count > 0;
  }
}

export const vehicleRepository = new VehicleRepository();
