import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/auth';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }
  const token = header.slice(7);
  try {
    const { userId } = verifyAccessToken(token);
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
