import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { staffRepository } from '../repositories/staff.repository';

export class AuthService {
  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const staff = await staffRepository.findByEmail(email);
    if (!staff) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(password, staff.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    const accessToken = jwt.sign(
      { staffId: staff.id, email: staff.email, type: 'access' },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiry as any },
    );

    const refreshToken = jwt.sign(
      { staffId: staff.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry as any },
    );

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
