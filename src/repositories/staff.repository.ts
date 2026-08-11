import db from '../config/database';
import { Staff } from '../types';

export class StaffRepository {
  async findByEmail(email: string): Promise<Staff | undefined> {
    return db('staff').where({ email }).first();
  }

  async findById(id: number): Promise<Staff | undefined> {
    return db('staff').where({ id }).first();
  }
}

export const staffRepository = new StaffRepository();
