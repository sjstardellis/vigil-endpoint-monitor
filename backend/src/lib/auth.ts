import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from './env';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface AccessTokenPayload {
  userId: string;
}

function parseDurationToSeconds(raw: string): number {
  const match = /^(\d+)([smhd])$/.exec(raw);
  if (!match) throw new Error(`Invalid duration: ${raw}`);
  const valueStr = match[1];
  const unit = match[2];
  if (!valueStr || !unit) throw new Error(`Invalid duration: ${raw}`);
  const value = parseInt(valueStr, 10);
  const perUnit: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const mult = perUnit[unit];
  if (!mult) throw new Error(`Invalid duration unit: ${unit}`);
  return value * mult;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: parseDurationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload');
  }
  const { userId } = decoded as Record<string, unknown>;
  if (typeof userId !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { userId };
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function refreshTokenExpiryDate(): Date {
  const seconds = parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN);
  return new Date(Date.now() + seconds * 1000);
}
