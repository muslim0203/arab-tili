/**
 * Refresh token uchun httpOnly cookie yordamchilari.
 *
 * httpOnly cookie'ni JavaScript o'qiy olmaydi — XSS hujumi bo'lganda ham
 * refresh token o'g'irlanmaydi (localStorage'dan farqli).
 *
 * Eslatma: frontend va backend turli domenlarda bo'lsa (masalan vercel.app + railway.app),
 * production'da SameSite=None; Secure ishlatiladi va CORS'da credentials: true bo'lishi shart
 * (bizda allaqachon shunday).
 */
import { Response, Request } from "express";
import { config } from "../config.js";

const isProd = config.nodeEnv === "production";

export const REFRESH_COOKIE = "arabexam_refresh";

const cookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    // Faqat auth endpointlariga yuboriladi — boshqa so'rovlarga ortiqcha yuk bo'lmaydi.
    path: "/api/auth",
};

export function setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
        ...cookieOpts,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 kun — refresh token muddati bilan bir xil
    });
}

export function clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, cookieOpts);
}

/** Cookie header'dan refresh tokenni o'qish (cookie-parser'siz, minimal). */
export function getRefreshCookie(req: Request): string | null {
    const header = req.headers.cookie;
    if (!header) return null;
    for (const part of header.split(";")) {
        const idx = part.indexOf("=");
        if (idx < 0) continue;
        if (part.slice(0, idx).trim() === REFRESH_COOKIE) {
            return decodeURIComponent(part.slice(idx + 1).trim());
        }
    }
    return null;
}
