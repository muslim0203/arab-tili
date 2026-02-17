import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyAccess } from "../lib/jwt.js";

export type AuthRequest = Request & {
  userId?: string;
  user?: { id: string; email: string; fullName: string; languagePreference: string; subscriptionTier: string; subscriptionExpiresAt: Date | null; isAdmin: boolean };
};

function effectiveTier(tier: string, expiresAt: Date | null): string {
  if (!expiresAt) return tier;
  if (new Date() > expiresAt) return "FREE";
  return tier;
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: "Token required" });
    return;
  }

  try {
    const payload = verifyAccess(token);
    const row = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, fullName: true, languagePreference: true, subscriptionTier: true, subscriptionExpiresAt: true, isAdmin: true },
    });
    if (!row) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    req.userId = row.id;
    req.user = {
      ...row,
      subscriptionTier: effectiveTier(row.subscriptionTier, row.subscriptionExpiresAt),
    };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user?.isAdmin) {
    res.status(403).json({ message: "Admin huquqi kerak" });
    return;
  }
  next();
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccess(token);
    const row = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, fullName: true, languagePreference: true, subscriptionTier: true, subscriptionExpiresAt: true, isAdmin: true },
    });
    if (row) {
      req.userId = row.id;
      req.user = { ...row, subscriptionTier: effectiveTier(row.subscriptionTier, row.subscriptionExpiresAt) };
    }
  } catch {
    // ignore invalid token
  }
  next();
}
