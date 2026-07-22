/**
 * AI so'rovlari uchun kunlik kvota (foydalanuvchi boshiga).
 *
 * aiLimiter (daqiqasiga 10) qisqa portlashlardan himoya qiladi, lekin kun davomida
 * cheksiz so'rov yuborib OpenAI/Gemini hisobini "yeb qo'yish" mumkin edi.
 * Bu middleware har bir foydalanuvchi uchun kunlik umumiy limit qo'yadi.
 *
 * Hisoblagich xotirada saqlanadi — server qayta ishga tushsa nolga tushadi.
 * Bu qat'iy billing emas, xarajatni jilovlash mexanizmi; keyinchalik Redis'ga
 * o'tkazish mumkin.
 */
import { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.js";

const env = process.env;
const FREE_DAILY = parseInt(env.AI_DAILY_LIMIT_FREE ?? "20", 10);
const PAID_DAILY = parseInt(env.AI_DAILY_LIMIT_PAID ?? "200", 10);

// key: "YYYY-MM-DD:userId" -> so'rovlar soni
const counters = new Map<string, number>();
let currentDay = "";

function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Kun almashganda eski hisoblagichlarni tozalash (xotira o'smasligi uchun). */
function rotateIfNeeded(): void {
    const today = todayKey();
    if (today !== currentDay) {
        counters.clear();
        currentDay = today;
    }
}

export function aiDailyQuota(req: AuthRequest, res: Response, next: NextFunction): void {
    rotateIfNeeded();

    const userId = req.userId;
    if (!userId) {
        // authenticateToken'dan keyin ishlatilishi kerak
        res.status(401).json({ message: "Token required" });
        return;
    }

    const tier = req.user?.subscriptionTier ?? "FREE";
    const limit = tier === "FREE" ? FREE_DAILY : PAID_DAILY;

    const key = `${currentDay}:${userId}`;
    const used = counters.get(key) ?? 0;

    if (used >= limit) {
        res.status(429).json({
            message:
                tier === "FREE"
                    ? `Kunlik AI limiti tugadi (${limit} ta so'rov). Ertaga qayta urinib ko'ring yoki obunani yangilang.`
                    : `Kunlik AI limiti tugadi (${limit} ta so'rov). Ertaga qayta urinib ko'ring.`,
            dailyLimit: limit,
            used,
        });
        return;
    }

    counters.set(key, used + 1);
    next();
}
