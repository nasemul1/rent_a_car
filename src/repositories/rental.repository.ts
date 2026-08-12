import { Knex } from 'knex';
import db from '../config/database';
import { Rental, PaginationParams } from '../types';

export class RentalRepository {
  async findAll(
    params: PaginationParams,
    filters: { vehicle_id?: number; status?: string; start?: string; end?: string },
  ): Promise<{ data: Rental[]; total: number }> {
    let query = db('rentals');
    let countQuery = db('rentals');

    if (filters.vehicle_id) {
      query = query.where('vehicle_id', filters.vehicle_id);
      countQuery = countQuery.where('vehicle_id', filters.vehicle_id);
    }

    if (filters.status) {
      query = query.where('status', filters.status);
      countQuery = countQuery.where('status', filters.status);
    }

    if (filters.start) {
      query = query.where('start_date', '>=', filters.start);
      countQuery = countQuery.where('start_date', '>=', filters.start);
    }

    if (filters.end) {
      query = query.where('end_date', '<=', filters.end);
      countQuery = countQuery.where('end_date', '<=', filters.end);
    }

    const total = (await countQuery.count('* as count').first())?.count || 0;
    const data = await query
      .orderBy('created_at', 'desc')
      .offset((params.page - 1) * params.limit)
      .limit(params.limit);

    return { data, total: Number(total) };
  }

  async findById(id: number): Promise<Rental | undefined> {
    return db('rentals').where({ id }).first();
  }

  async findOverlapping(
    vehicleId: number,
    startDate: string,
    endDate: string,
    excludeId?: number,
    trx?: Knex.Transaction,
  ): Promise<Rental | undefined> {
    const conn = trx || db;
    let query = conn('rentals')
      .where('vehicle_id', vehicleId)
      .whereIn('status', ['booked', 'ongoing'])
      .where('start_date', '<=', endDate)
      .where('end_date', '>=', startDate);

    if (excludeId) query = query.whereNot('id', excludeId);

    return query.first();
  }

  async create(data: Partial<Rental>, trx?: Knex.Transaction): Promise<Rental> {
    const conn = trx || db;
    const [result] = await conn('rentals').insert(data).returning('*');
    return result;
  }

  async update(id: number, data: Partial<Rental>, trx?: Knex.Transaction): Promise<Rental | undefined> {
    const conn = trx || db;
    const [result] = await conn('rentals')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return result;
  }

  async delete(id: number): Promise<boolean> {
    const count = await db('rentals').where({ id }).del();
    return count > 0;
  }

  async getMonthlyReport(month: string, vehicleId?: number): Promise<any[]> {
    const [year, m] = month.split('-').map(Number);
    const monthStart = `${year}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const monthEnd = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let query = db('vehicles as v')
      .join('rentals as r', 'r.vehicle_id', 'v.id')
      .where('r.status', 'in', ['booked', 'ongoing', 'completed'])
      .where('r.start_date', '<=', monthEnd)
      .where('r.end_date', '>=', monthStart)
      .select(
        'v.id',
        'v.name',
        db.raw('COUNT(r.id)::int AS total_bookings'),
        db.raw(
          `SUM((LEAST(r.end_date, ?::date) - GREATEST(r.start_date, ?::date) + 1))::int AS days_rented`,
          [monthEnd, monthStart],
        ),
        db.raw(
          `SUM((LEAST(r.end_date, ?::date) - GREATEST(r.start_date, ?::date) + 1) * v.daily_rate)::numeric(10,2) AS revenue`,
          [monthEnd, monthStart],
        ),
      )
      .groupBy('v.id', 'v.name')
      .orderBy('revenue', 'desc');

    if (vehicleId) query = query.where('v.id', vehicleId);

    return query;
  }
}

export const rentalRepository = new RentalRepository();
