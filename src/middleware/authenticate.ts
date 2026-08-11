import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

interface TokenPayload {
  staffId: number;
  email: string;
  type: 'access' | 'refresh';
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const accessToken = req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;

  if (accessToken) {
    try {
      const payload = jwt.verify(accessToken, config.jwt.secret) as TokenPayload;
      req.staff = { id: payload.staffId, email: payload.email, name: '' };
      next();
      return;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError && refreshToken) {
        try {
          const refreshPayload = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;
          const newAccessToken = jwt.sign(
            { staffId: refreshPayload.staffId, email: refreshPayload.email, type: 'access' },
            config.jwt.secret,
            { expiresIn: config.jwt.accessExpiry as any },
          );
          res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
            maxAge: 3600000,
          });
          req.staff = { id: refreshPayload.staffId, email: refreshPayload.email, name: '' };
          next();
          return;
        } catch {
          // fall through to 401
        }
      }
    }
  }

  res.status(401).json({ error: 'Authentication required' });
}
