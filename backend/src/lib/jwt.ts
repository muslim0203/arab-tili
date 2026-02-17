import jwt from "jsonwebtoken";
import { config } from "../config.js";

const { jwtSecret, jwtRefreshSecret, jwtAccessExpiresIn, jwtRefreshExpiresIn } = config;

export type AccessPayload = { userId: string; email: string };
export type RefreshPayload = { userId: string };
export type ResetPayload = { email: string; purpose: "reset" };

export function signAccess(payload: AccessPayload): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtAccessExpiresIn });
}

export function signRefresh(payload: RefreshPayload): string {
  return jwt.sign(payload, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn });
}

export function signPasswordResetToken(payload: ResetPayload): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: "1h" });
}

export function verifyAccess(token: string): AccessPayload {
  return jwt.verify(token, jwtSecret) as AccessPayload;
}

export function verifyRefresh(token: string): RefreshPayload {
  return jwt.verify(token, jwtRefreshSecret) as RefreshPayload;
}

export function verifyPasswordResetToken(token: string): ResetPayload {
  const payload = jwt.verify(token, jwtSecret) as ResetPayload;
  if (payload.purpose !== "reset") throw new Error("Invalid token purpose");
  return payload;
}
