/**
 * Oddiy kunlik scheduler — tashqi kutubxonasiz (node-cron o'rniga setInterval).
 *
 * Vazifalar:
 *  1. Obuna tugashiga 3 kun (yoki 1 kun) qolganda email eslatma yuborish
 *     (oldin bu faqat foydalanuvchi login qilganda yuborilardi).
 *  2. 24 soatdan eski PENDING to'lovlarni CANCELLED holatiga o'tkazish
 *     (to'lanmagan buyurtmalar bazada to'planib qolmasligi uchun).
 *
 * Eslatma: bir nechta server instansi bo'lsa, bu vazifalar har birida ishlaydi.
 * Masshtablashda tashqi cron (Railway cron, GitHub Actions schedule) ga o'tkazing.
 */
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";
import { cleanupExpiredRefreshTokens } from "./refresh-tokens.js";
import { isEmailConfigured, sendSubscriptionReminder } from "../services/email.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 24 soatdan eski PENDING to'lovlarni bekor qilish. */
export async function cancelStalePendingPayments(): Promise<number> {
    const cutoff = new Date(Date.now() - DAY_MS);
    const result = await prisma.payment.updateMany({
        where: { status: "PENDING", createdAt: { lt: cutoff } },
        data: { status: "CANCELLED" },
    });
    if (result.count > 0) {
        logger.info("Eski PENDING to'lovlar bekor qilindi", { count: result.count });
    }
    return result.count;
}

/**
 * Obunasi 3 kun ichida tugaydigan foydalanuvchilarga eslatma yuborish.
 * Kuniga bir marta ishlaydi — har foydalanuvchi taxminan 3- va 1-kun oralig'ida eslatma oladi.
 */
export async function sendExpiryReminders(): Promise<number> {
    if (!isEmailConfigured()) return 0;

    const now = new Date();
    const in3days = new Date(now.getTime() + 3 * DAY_MS);

    const users = await prisma.user.findMany({
        where: {
            subscriptionTier: { not: "FREE" },
            subscriptionExpiresAt: { gt: now, lte: in3days },
        },
        select: { email: true, fullName: true, subscriptionExpiresAt: true },
    });

    let sent = 0;
    for (const u of users) {
        if (!u.subscriptionExpiresAt) continue;
        try {
            const ok = await sendSubscriptionReminder(u.email, u.fullName, u.subscriptionExpiresAt);
            if (ok) sent++;
        } catch (e) {
            logger.error("Obuna eslatmasi yuborilmadi", e, { email: u.email });
        }
    }
    if (sent > 0) logger.info("Obuna eslatmalari yuborildi", { count: sent });
    return sent;
}

async function runDailyTasks(): Promise<void> {
    try {
        await cancelStalePendingPayments();
    } catch (e) {
        logger.error("PENDING tozalash xatosi", e);
    }
    try {
        await sendExpiryReminders();
    } catch (e) {
        logger.error("Obuna eslatma vazifasi xatosi", e);
    }
    try {
        await cleanupExpiredRefreshTokens();
    } catch (e) {
        logger.error("Refresh token tozalash xatosi", e);
    }
}

/** Server ishga tushganda chaqiriladi. */
export function startSchedulers(): void {
    // Birinchi ishga tushirish — server ko'tarilgach 1 daqiqadan keyin (startupni sekinlashtirmaslik uchun).
    setTimeout(() => {
        void runDailyTasks();
    }, 60 * 1000);

    // Keyin har 24 soatda.
    setInterval(() => {
        void runDailyTasks();
    }, DAY_MS);

    logger.info("Kunlik scheduler ishga tushdi (PENDING tozalash + obuna eslatmalari + refresh token tozalash)");
}
