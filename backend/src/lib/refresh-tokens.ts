/**
 * Refresh tokenlarni bekor qilish (revocation) va rotatsiya.
 *
 * Muammo: JWT o'z-o'zidan bekor qilinmaydi — imzo to'g'ri bo'lsa, muddati
 * tugagunicha (7 kun) ishlayveradi. Logout qilinsa ham, token o'g'irlangan
 * bo'lsa ham. `pwv` claim faqat parol o'zgarganda yordam beradi.
 *
 * Yechim: har bir berilgan refresh tokenning sha256 hash'i bazada saqlanadi.
 * Token faqat bazada mavjud VA bekor qilinmagan bo'lsa qabul qilinadi.
 *
 * Rotatsiya: har `refresh-token` chaqiruvida eski token bekor qilinadi va
 * yangisi beriladi. Bu tokenning "yashash oynasi"ni keskin qisqartiradi.
 *
 * Qayta ishlatishni aniqlash (reuse detection): allaqachon bekor qilingan
 * token qayta taqdim etilsa — bu o'g'irlangan token belgisi. Bunday holatda
 * foydalanuvchining BARCHA tokenlari bekor qilinadi (hujumchi ham, haqiqiy
 * foydalanuvchi ham chiqarib yuboriladi va qaytadan login qilishga majbur).
 */
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";
import { signRefresh, verifyRefresh, hashRefreshToken, type RefreshPayload } from "./jwt.js";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 kun — jwtRefreshExpiresIn bilan mos

/**
 * Qayta ishlatishni aniqlashdagi "yengillik oynasi".
 *
 * Nega kerak: foydalanuvchida ikki tab ochiq bo'lsa, ikkalasi ham bir vaqtda
 * refresh yuborishi mumkin. Birinchisi tokenni rotatsiya qiladi, ikkinchisi esa
 * (javob yetib borgunicha) hali eski tokenni yuboradi. Leeway bo'lmasa bu
 * "o'g'irlik" deb baholanib, foydalanuvchi hamma joydan chiqarib yuboriladi.
 *
 * Shu qisqa oyna ichida bekor qilingan token hali qabul qilinadi. Undan keyin —
 * haqiqiy qayta ishlatish deb hisoblanadi.
 */
const REUSE_LEEWAY_MS = 30 * 1000;

/** Yangi refresh token beradi va uning hash'ini bazaga yozadi. */
export async function issueRefreshToken(userId: string, pwv: string): Promise<string> {
    const token = signRefresh({ userId, pwv });
    await prisma.refreshToken.create({
        data: {
            tokenHash: hashRefreshToken(token),
            userId,
            expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        },
    });
    return token;
}

export type ConsumeResult =
    | { ok: true; payload: RefreshPayload }
    | { ok: false; reason: "invalid" | "unknown" | "revoked" | "expired" };

/**
 * Refresh tokenni tekshiradi va bekor qiladi (rotatsiya uchun "iste'mol qiladi").
 * Muvaffaqiyatli bo'lsa chaqiruvchi darhol `issueRefreshToken` bilan yangisini berishi kerak.
 */
export async function consumeRefreshToken(token: string): Promise<ConsumeResult> {
    let payload: RefreshPayload;
    try {
        payload = verifyRefresh(token);
    } catch {
        return { ok: false, reason: "invalid" };
    }

    const tokenHash = hashRefreshToken(token);
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    // Bazada yo'q: rotatsiya joriy etilishidan oldingi eski token yoki soxta yozuv.
    if (!record) return { ok: false, reason: "unknown" };

    if (record.expiresAt.getTime() <= Date.now()) {
        return { ok: false, reason: "expired" };
    }

    if (record.revokedAt) {
        // Logout / majburiy bekor qilish — leeway qo'llanilmaydi, darhol rad etiladi.
        if (!record.rotated) return { ok: false, reason: "revoked" };

        // Leeway oynasi ichida — bu ko'p tabli parallel refresh, o'g'irlik emas.
        if (Date.now() - record.revokedAt.getTime() <= REUSE_LEEWAY_MS) {
            return { ok: true, payload };
        }

        // Haqiqiy qayta ishlatish — barcha sessiyalarni bekor qilamiz.
        const revoked = await revokeAllForUser(record.userId);
        logger.warn("Refresh token qayta ishlatildi — barcha sessiyalar bekor qilindi", {
            userId: record.userId,
            revokedCount: revoked,
        });
        return { ok: false, reason: "revoked" };
    }

    await prisma.refreshToken.update({
        where: { tokenHash },
        data: { revokedAt: new Date(), rotated: true },
    });

    return { ok: true, payload };
}

/** Bitta tokenni bekor qilish (logout). Token noto'g'ri bo'lsa jimgina o'tkazib yuboriladi. */
export async function revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.updateMany({
        where: { tokenHash: hashRefreshToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
    });
}

/** Foydalanuvchining barcha aktiv sessiyalarini bekor qilish (parol tiklash, hisob buzilishi). */
export async function revokeAllForUser(userId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    return result.count;
}

/**
 * Muddati o'tgan yozuvlarni o'chirish (jadval cheksiz o'smasligi uchun).
 * Bekor qilingan yozuvlar ham muddati tugagach o'chiriladi — o'sha paytgacha
 * ular qayta ishlatishni aniqlash uchun kerak.
 */
export async function cleanupExpiredRefreshTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
        logger.info("Muddati o'tgan refresh tokenlar o'chirildi", { count: result.count });
    }
    return result.count;
}
