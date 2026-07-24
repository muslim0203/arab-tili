/**
 * AccessControlService – Centralized access control for the pricing system.
 *
 * Plans:
 *   FREE     – limited demos only
 *   STANDARD – pay-per-exam (Purchase model)
 *   PRO      – monthly subscription with quotas (Subscription + UsageTracking)
 */

import { prisma } from "../lib/prisma.js";

// ───── Plan limits ─────
export const PRO_LIMITS = {
    mock: 3,
    writing: 10,
    speaking: 6,
    aiTutor: 50,
} as const;

export const FREE_LIMITS = {
    mock: 0,     // demo only (handled separately)
    writing: 1,  // 1 demo
    speaking: 1, // 1 demo (1 question)
    aiTutor: 0,  // Pro only
} as const;

export type PlanType = "free" | "standard" | "pro";
export type UsageType = "mock" | "writing" | "speaking" | "aiTutor";

// ───── Helpers ─────

/** Get the user's active subscription (Pro plan) */
async function getActiveSubscription(userId: string) {
    return prisma.subscription.findFirst({
        where: {
            userId,
            planType: "pro",
            status: "active",
            expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: "desc" },
    });
}

/** Get valid (non-expired, remaining > 0) purchases of a product type */
async function getValidPurchases(userId: string, productType: string) {
    return prisma.purchase.findMany({
        where: {
            userId,
            productType,
            remainingUses: { gt: 0 },
            expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: "asc" },
    });
}

/** Get or create usage tracking row for the current billing period */
async function getOrCreateUsage(userId: string, type: UsageType, subscription: { startedAt: Date; expiresAt: Date }) {
    // Find current period
    const now = new Date();
    const periodStart = new Date(subscription.startedAt);
    // Calculate which 30-day period we're in
    while (periodStart.getTime() + 30 * 24 * 60 * 60 * 1000 <= now.getTime()) {
        periodStart.setDate(periodStart.getDate() + 30);
    }
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 30);

    let usage = await prisma.usageTracking.findFirst({
        where: {
            userId,
            type,
            periodStart: { gte: periodStart },
            periodEnd: { lte: periodEnd },
        },
    });

    if (!usage) {
        // Create new tracking row for this period
        usage = await prisma.usageTracking.create({
            data: {
                userId,
                type,
                usedCount: 0,
                periodStart,
                periodEnd,
            },
        });
    }

    return usage;
}

/** Determine user's effective plan type */
export async function getUserPlanType(userId: string): Promise<PlanType> {
    const sub = await getActiveSubscription(userId);
    if (sub) return "pro";

    const purchases = await getValidPurchases(userId, "mock_exam");
    if (purchases.length > 0) return "standard";

    return "free";
}

// ───── Access Checks ─────

export type AccessResult = {
    allowed: boolean;
    reason?: string;
    planType: PlanType;
};

/**
 * Can user access full Sarf platform?
 * Only PRO users get full access.
 */
export async function canAccessFullSarf(userId: string): Promise<AccessResult> {
    const planType = await getUserPlanType(userId);
    if (planType === "pro") {
        return { allowed: true, planType };
    }
    return {
        allowed: false,
        planType,
        reason: "Sarf platformasiga to'liq kirish faqat Pro rejada mavjud.",
    };
}

/**
 * Can user start a full mock exam?
 */
export async function canStartMock(userId: string): Promise<AccessResult> {
    const planType = await getUserPlanType(userId);

    if (planType === "free") {
        return {
            allowed: false,
            planType,
            reason: "Bepul rejada faqat demo imtihon mavjud. Imtihon sotib oling yoki Pro rejaga o'ting.",
        };
    }

    if (planType === "standard") {
        const purchases = await getValidPurchases(userId, "mock_exam");
        if (purchases.length > 0 && purchases[0].remainingUses > 0) {
            return { allowed: true, planType };
        }
        return {
            allowed: false,
            planType,
            reason: "Imtihon urinishlaringiz tugadi. Yangi imtihon sotib oling.",
        };
    }

    // Pro plan
    const sub = await getActiveSubscription(userId);
    if (!sub) return { allowed: false, planType: "free", reason: "Obuna topilmadi." };

    const usage = await getOrCreateUsage(userId, "mock", sub);
    if (usage.usedCount >= PRO_LIMITS.mock) {
        return {
            allowed: false,
            planType,
            reason: `Oylik mock imtihon limiti tugadi (${PRO_LIMITS.mock}/${PRO_LIMITS.mock}).`,
        };
    }

    return { allowed: true, planType };
}

/**
 * Can user use Writing AI?
 */
export async function canUseWritingAI(userId: string): Promise<AccessResult> {
    const planType = await getUserPlanType(userId);

    if (planType === "free") {
        // Check if they've used their one demo
        const totalUsed = await prisma.usageTracking.aggregate({
            where: { userId, type: "writing" },
            _sum: { usedCount: true },
        });
        if ((totalUsed._sum.usedCount ?? 0) >= FREE_LIMITS.writing) {
            return {
                allowed: false,
                planType,
                reason: "Bepul demo yakunlandi. Pro rejaga o'ting.",
            };
        }
        return { allowed: true, planType };
    }

    if (planType === "standard") {
        return {
            allowed: false,
            planType,
            reason: "Writing AI faqat Pro rejada mavjud.",
        };
    }

    // Pro plan
    const sub = await getActiveSubscription(userId);
    if (!sub) return { allowed: false, planType: "free", reason: "Obuna topilmadi." };

    const usage = await getOrCreateUsage(userId, "writing", sub);
    if (usage.usedCount >= PRO_LIMITS.writing) {
        return {
            allowed: false,
            planType,
            reason: `Oylik writing AI limiti tugadi (${PRO_LIMITS.writing}/${PRO_LIMITS.writing}).`,
        };
    }

    return { allowed: true, planType };
}

/**
 * Can user use Speaking AI?
 */
export async function canUseSpeakingAI(userId: string): Promise<AccessResult> {
    const planType = await getUserPlanType(userId);

    if (planType === "free") {
        const totalUsed = await prisma.usageTracking.aggregate({
            where: { userId, type: "speaking" },
            _sum: { usedCount: true },
        });
        if ((totalUsed._sum.usedCount ?? 0) >= FREE_LIMITS.speaking) {
            return {
                allowed: false,
                planType,
                reason: "Bepul demo yakunlandi. Pro rejaga o'ting.",
            };
        }
        return { allowed: true, planType };
    }

    if (planType === "standard") {
        return {
            allowed: false,
            planType,
            reason: "Speaking AI faqat Pro rejada mavjud.",
        };
    }

    // Pro plan
    const sub = await getActiveSubscription(userId);
    if (!sub) return { allowed: false, planType: "free", reason: "Obuna topilmadi." };

    const usage = await getOrCreateUsage(userId, "speaking", sub);
    if (usage.usedCount >= PRO_LIMITS.speaking) {
        return {
            allowed: false,
            planType,
            reason: `Oylik speaking AI limiti tugadi (${PRO_LIMITS.speaking}/${PRO_LIMITS.speaking}).`,
        };
    }

    return { allowed: true, planType };
}

/**
 * Can user use AI Tutor?
 * Only Pro users can use AI Tutor (50 messages/month).
 */
export async function canUseAITutor(userId: string): Promise<AccessResult> {
    const planType = await getUserPlanType(userId);

    if (planType !== "pro") {
        return {
            allowed: false,
            planType,
            reason: "AI Tutor faqat Pro rejada mavjud. Pro rejaga o'ting.",
        };
    }

    const sub = await getActiveSubscription(userId);
    if (!sub) return { allowed: false, planType: "free", reason: "Obuna topilmadi." };

    const usage = await getOrCreateUsage(userId, "aiTutor", sub);
    if (usage.usedCount >= PRO_LIMITS.aiTutor) {
        return {
            allowed: false,
            planType,
            reason: `Oylik AI Tutor limiti tugadi (${PRO_LIMITS.aiTutor}/${PRO_LIMITS.aiTutor}).`,
        };
    }

    return { allowed: true, planType };
}

// ───── Usage Tracking Updates ─────

/**
 * Record mock exam usage. Decrements purchase (Standard) or increments usage (Pro).
 */
export async function recordMockUsage(userId: string): Promise<void> {
    const planType = await getUserPlanType(userId);

    if (planType === "standard") {
        // Find earliest expiring valid purchase and decrement
        const purchases = await getValidPurchases(userId, "mock_exam");
        if (purchases.length > 0) {
            await prisma.purchase.update({
                where: { id: purchases[0].id },
                data: { remainingUses: { decrement: 1 } },
            });
        }
    } else if (planType === "pro") {
        const sub = await getActiveSubscription(userId);
        if (sub) {
            const usage = await getOrCreateUsage(userId, "mock", sub);
            await prisma.usageTracking.update({
                where: { id: usage.id },
                data: { usedCount: { increment: 1 } },
            });
        }
    }
}

/**
 * Record writing AI usage.
 */
export async function recordWritingUsage(userId: string): Promise<void> {
    const planType = await getUserPlanType(userId);

    if (planType === "free") {
        // Create a permanent usage record for the free demo
        const now = new Date();
        const farFuture = new Date("2099-12-31");
        await prisma.usageTracking.upsert({
            where: {
                userId_type_periodStart: {
                    userId,
                    type: "writing",
                    periodStart: new Date("2000-01-01"),
                },
            },
            create: {
                userId,
                type: "writing",
                usedCount: 1,
                periodStart: new Date("2000-01-01"),
                periodEnd: farFuture,
            },
            update: {
                usedCount: { increment: 1 },
            },
        });
    } else if (planType === "pro") {
        const sub = await getActiveSubscription(userId);
        if (sub) {
            const usage = await getOrCreateUsage(userId, "writing", sub);
            await prisma.usageTracking.update({
                where: { id: usage.id },
                data: { usedCount: { increment: 1 } },
            });
        }
    }
}

/**
 * Record speaking AI usage.
 */
export async function recordSpeakingUsage(userId: string): Promise<void> {
    const planType = await getUserPlanType(userId);

    if (planType === "free") {
        const now = new Date();
        const farFuture = new Date("2099-12-31");
        await prisma.usageTracking.upsert({
            where: {
                userId_type_periodStart: {
                    userId,
                    type: "speaking",
                    periodStart: new Date("2000-01-01"),
                },
            },
            create: {
                userId,
                type: "speaking",
                usedCount: 1,
                periodStart: new Date("2000-01-01"),
                periodEnd: farFuture,
            },
            update: {
                usedCount: { increment: 1 },
            },
        });
    } else if (planType === "pro") {
        const sub = await getActiveSubscription(userId);
        if (sub) {
            const usage = await getOrCreateUsage(userId, "speaking", sub);
            await prisma.usageTracking.update({
                where: { id: usage.id },
                data: { usedCount: { increment: 1 } },
            });
        }
    }
}

/**
 * Record AI Tutor usage.
 */
export async function recordAITutorUsage(userId: string): Promise<void> {
    const planType = await getUserPlanType(userId);

    if (planType === "pro") {
        const sub = await getActiveSubscription(userId);
        if (sub) {
            const usage = await getOrCreateUsage(userId, "aiTutor", sub);
            await prisma.usageTracking.update({
                where: { id: usage.id },
                data: { usedCount: { increment: 1 } },
            });
        }
    }
}

// ───── Full Access Status ─────

export type AccessStatus = {
    planType: PlanType;
    subscription: {
        active: boolean;
        expiresAt: string | null;
    };
    purchases: {
        mockExam: {
            available: number;
            expiresAt: string | null;
        };
    };
    usage: {
        mock: { used: number; limit: number };
        writing: { used: number; limit: number };
        speaking: { used: number; limit: number };
        aiTutor: { used: number; limit: number };
    };
    access: {
        fullSarf: boolean;
        mockExam: boolean;
        writingAI: boolean;
        speakingAI: boolean;
        aiTutor: boolean;
    };
};

export async function getAccessStatus(userId: string): Promise<AccessStatus> {
    const planType = await getUserPlanType(userId);
    const sub = await getActiveSubscription(userId);
    const purchases = await getValidPurchases(userId, "mock_exam");

    // Calculate usage
    let mockUsed = 0, writingUsed = 0, speakingUsed = 0, aiTutorUsed = 0;
    let mockLimit = 0, writingLimit = 0, speakingLimit = 0, aiTutorLimit = 0;

    if (planType === "pro" && sub) {
        const [mockUsage, writingUsage, speakingUsage, aiTutorUsage] = await Promise.all([
            getOrCreateUsage(userId, "mock", sub),
            getOrCreateUsage(userId, "writing", sub),
            getOrCreateUsage(userId, "speaking", sub),
            getOrCreateUsage(userId, "aiTutor", sub),
        ]);
        mockUsed = mockUsage.usedCount;
        writingUsed = writingUsage.usedCount;
        speakingUsed = speakingUsage.usedCount;
        aiTutorUsed = aiTutorUsage.usedCount;
        mockLimit = PRO_LIMITS.mock;
        writingLimit = PRO_LIMITS.writing;
        speakingLimit = PRO_LIMITS.speaking;
        aiTutorLimit = PRO_LIMITS.aiTutor;
    } else if (planType === "free") {
        const totalWriting = await prisma.usageTracking.aggregate({
            where: { userId, type: "writing" },
            _sum: { usedCount: true },
        });
        const totalSpeaking = await prisma.usageTracking.aggregate({
            where: { userId, type: "speaking" },
            _sum: { usedCount: true },
        });
        writingUsed = totalWriting._sum.usedCount ?? 0;
        speakingUsed = totalSpeaking._sum.usedCount ?? 0;
        writingLimit = FREE_LIMITS.writing;
        speakingLimit = FREE_LIMITS.speaking;
    }

    // Run access checks
    const [sarf, mock, writing, speaking, aiTutor] = await Promise.all([
        canAccessFullSarf(userId),
        canStartMock(userId),
        canUseWritingAI(userId),
        canUseSpeakingAI(userId),
        canUseAITutor(userId),
    ]);

    const totalPurchaseUses = purchases.reduce((sum, p) => sum + p.remainingUses, 0);

    return {
        planType,
        subscription: {
            active: !!sub,
            expiresAt: sub?.expiresAt.toISOString() ?? null,
        },
        purchases: {
            mockExam: {
                available: totalPurchaseUses,
                expiresAt: purchases.length > 0 ? purchases[0].expiresAt.toISOString() : null,
            },
        },
        usage: {
            mock: { used: planType === "standard" ? 0 : mockUsed, limit: planType === "standard" ? totalPurchaseUses : mockLimit },
            writing: { used: writingUsed, limit: writingLimit },
            speaking: { used: speakingUsed, limit: speakingLimit },
            aiTutor: { used: aiTutorUsed, limit: aiTutorLimit },
        },
        access: {
            fullSarf: sarf.allowed,
            mockExam: mock.allowed,
            writingAI: writing.allowed,
            speakingAI: speaking.allowed,
            aiTutor: aiTutor.allowed,
        },
    };
}
