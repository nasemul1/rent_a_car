import { Request, Response, NextFunction } from 'express';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
} as const;

function getStatusColor(status: number): string {
  if (status >= 500) return COLORS.red;
  if (status >= 400) return COLORS.yellow;
  if (status >= 300) return COLORS.cyan;
  return COLORS.green;
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

export function logger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;
    const statusColor = getStatusColor(status);
    const durationColor = duration > 1000 ? COLORS.red : duration > 500 ? COLORS.yellow : COLORS.gray;

    const methodStr = padRight(method, 7);
    const statusStr = `${statusColor}${status}${COLORS.reset}`;
    const durationStr = `${durationColor}${duration}ms${COLORS.reset}`;

    console.log(
      `${COLORS.gray}${new Date().toISOString()}${COLORS.reset} ` +
        `${COLORS.bold}${methodStr}${COLORS.reset} ` +
        `${url} ` +
        `${statusStr} ` +
        `${durationStr}`,
    );
  });

  next();
}
