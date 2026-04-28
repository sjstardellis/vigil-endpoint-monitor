import { Prisma } from '@prisma/client';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  refreshTokenExpiryDate,
  signAccessToken,
  verifyPassword,
} from '../lib/auth';
import { prisma } from '../lib/prisma';
import { authRequired } from '../middleware/auth';
import { loginSchema, refreshSchema, registerSchema } from '../schemas/auth';

export const authRouter = Router();

// Rate limiters. Keyed by IP by default. `standardHeaders: 'draft-7'` emits
// the modern RateLimit-* headers so clients can back off politely.
//
// Tight budget for login/register — these are the bruteforce surface.
// Refresh gets a looser budget because legitimate clients may refresh often
// (e.g. multiple tabs all hitting a 401 at the same time).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many registrations from this IP, please try again later.' },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts, please try again later.' },
});

async function issueTokens(userId: string) {
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiryDate(),
    },
  });
  return {
    accessToken: signAccessToken({ userId }),
    refreshToken,
  };
}

authRouter.post('/register', registerLimiter, async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input', details: parse.error.flatten().fieldErrors });
    return;
  }
  const { email, password } = parse.data;
  try {
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) },
    });
    const tokens = await issueTokens(user.id);
    res.status(201).json({ user: { id: user.id, email: user.email }, ...tokens });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    throw err;
  }
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { email, password } = parse.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const tokens = await issueTokens(user.id);
  res.json({ user: { id: user.id, email: user.email }, ...tokens });
});

authRouter.post('/refresh', refreshLimiter, async (req, res) => {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const tokenHash = hashRefreshToken(parse.data.refreshToken);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });
  const tokens = await issueTokens(record.userId);
  res.json(tokens);
});

authRouter.post('/logout', async (req, res) => {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const tokenHash = hashRefreshToken(parse.data.refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  res.status(204).send();
});

authRouter.get('/me', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, createdAt: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});
