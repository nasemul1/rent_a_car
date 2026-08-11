import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { config } from '../config/env';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const { accessToken, refreshToken } = await authService.login(email, password);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 3600000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 604800000,
    });

    res.json({ message: 'Logged in' });
  }

  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  }

  async refresh(_req: Request, res: Response): Promise<void> {
    res.json({ message: 'Token refreshed' });
  }
}

export const authController = new AuthController();
