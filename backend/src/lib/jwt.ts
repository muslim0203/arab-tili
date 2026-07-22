import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config.js";

const { jwtSecret, jwtRefreshSecret, jwtResetSecret, jwtAccessExpiresIn, jwtRefreshExpiresIn } = config;

// Algoritmni qattiq belgilash (alg confusion / alg:none hujumlarining oldini oladi).
const JWT_ALG: jwt.Algorithm = "HS256";

export type AccessPayload = { userId: string; email: string };
// pwv (password version) – passwordHash'dan hosil qilingan qisqa barmoq izi.
// Parol o'zgarsa pwv ham o'zgaradi va eski refresh/reset tokenlar avtomatik yaroqsiz bo'ladi.
export type RefreshPayload = { userId: string; pwv: string };
export type ResetPayload = { email: string; purpose: "reset"; pwv: string };
export type VerifyEmailPayload = { email: string; purpose: "verify-email" };

/**
 * passwordHash'dan qisqa versiya-barmoq izi (tokenga parol hash'ining o'zini qo'ymaslik uchun).
 * Google foydalanuvchilarida passwordHash bo'sh bo'lishi mumkin.
 */
export function passwordVersion(passwordHash: string | null | undefined): string {
  return crypto
    .createHash("sha256")
    .update(passwordHash ?? "")
    .digest("hex")
    .slice(0, 16);
}

export function signAccess(payload: AccessPayload): string {
  return jwt.sign(payload, jwtSecret as jwt.Secret, { algorithm: JWT_ALG, expiresIn: jwtAccessExpiresIn as any });
}

export function signRefresh(payload: RefreshPayload): string {
  return jwt.sign(payload, jwtRefreshSecret as jwt.Secret, { algorithm: JWT_ALG, expiresIn: jwtRefreshExpiresIn as any });
}

export function signPasswordResetToken(payload: ResetPayload): string {
  return jwt.sign(payload, jwtResetSecret, { algorithm: JWT_ALG, expiresIn: "1h" });
}

export function verifyAccess(token: string): AccessPayload {
  return jwt.verify(token, jwtSecret, { algorithms: [JWT_ALG] }) as AccessPayload;
}

export function verifyRefresh(token: string): RefreshPayload {
  return jwt.verify(token, jwtRefreshSecret, { algorithms: [JWT_ALG] }) as RefreshPayload;
}

export function verifyPasswordResetToken(token: string): ResetPayload {
  const payload = jwt.verify(token, jwtResetSecret, { algorithms: [JWT_ALG] }) as ResetPayload;
  if (payload.purpose !== "reset") throw new Error("Invalid token purpose");
  return payload;
}

export function signEmailVerifyToken(payload: VerifyEmailPayload): string {
  return jwt.sign(payload, jwtResetSecret, { algorithm: JWT_ALG, expiresIn: "24h" });
}

export function verifyEmailVerifyToken(token: string): VerifyEmailPayload {
  const payload = jwt.verify(token, jwtResetSecret, { algorithms: [JWT_ALG] }) as VerifyEmailPayload;
  if (payload.purpose !== "verify-email") throw new Error("Invalid token purpose");
  return payload;
}

