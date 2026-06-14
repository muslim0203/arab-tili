import jwt from "jsonwebtoken";
import { config } from "../config.js";

const { jwtSecret, jwtRefreshSecret, jwtResetSecret, jwtAccessExpiresIn, jwtRefreshExpiresIn } = config;

// Algoritmni qattiq belgilash (alg confusion / alg:none hujumlarining oldini oladi).
const JWT_ALG: jwt.Algorithm = "HS256";

export type AccessPayload = { userId: string; email: string };
export type RefreshPayload = { userId: string };
export type ResetPayload = { email: string; purpose: "reset" };

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
