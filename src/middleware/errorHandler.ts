import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.message === 'Invalid credentials') {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (err.message.includes('already booked')) {
    res.status(409).json({ error: err.message });
    return;
  }

  if (err.message === 'Not found') {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
