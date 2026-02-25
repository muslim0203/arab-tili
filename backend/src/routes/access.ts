/**
 * Access Control API Routes
 *
 * POST /api/access/purchase/mock   – Simulate mock exam purchase
 * POST /api/access/subscribe/pro   – Simulate Pro subscription
 * GET  /api/access/status          – Get current access status
 * POST /api/access/usage/record    – Record feature usage
 */

import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import {
    getAccessStatus,
    recordMockUsage,
    recordWritingUsage,
    recordSpeakingUsage,
} from "../services/access-control.js";

const router = Router();

// ═══════════════════════════════════════════════
// GET /status – Full access status for current user
// ═══════════════════════════════════════════════
router.get("/status", authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const status = await getAccessStatus(userId);
    res.json(status);
});

// ═══════════════════════════════════════════════
// POST /purchase/mock – Simulate mock exam purchase (50,000 UZS)
// ═══════════════════════════════════════════════
router.post("/purchase/mock", authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    // Simulate payment – in production, Stripe/Click/Payme would verify first
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    const purchase = await prisma.purchase.create({
        data: {
            userId,
            productType: "mock_exam",
            quantity: 1,
            remainingUses: 1,
            expiresAt,
        },
    });

    // Also create a payment record for audit trail
    await prisma.payment.create({
        data: {
            userId,
            amount: 50_000,
            currency: "UZS",
            status: "COMPLETED",
            provider: "simulated",
            planId: "mock_exam",
            paidAt: new Date(),
        },
    });

    res.json({
        success: true,
        message: "Mock imtihon muvaffaqiyatli sotib olindi!",
        purchase: {
            id: purchase.id,
            productType: purchase.productType,
            remainingUses: purchase.remainingUses,
            expiresAt: purchase.expiresAt.toISOString(),
        },
    });
});

// ═══════════════════════════════════════════════
// POST /subscribe/pro – Simulate Pro subscription (89,000–119,000 UZS/month)
// ═══════════════════════════════════════════════
router.post("/subscribe/pro", authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    const parsed = z.object({
        priceLevel: z.enum(["basic", "premium"]).default("basic"),
    }).safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ message: "Noto'g'ri format." });
        return;
    }

    const amount = parsed.data.priceLevel === "premium" ? 119_000 : 89_000;

    // Calculate dates
    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Cancel any existing active subscription
    await prisma.subscription.updateMany({
        where: {
            userId,
            status: "active",
        },
        data: { status: "cancelled" },
    });

    // Create new subscription
    const subscription = await prisma.subscription.create({
        data: {
            userId,
            planType: "pro",
            startedAt,
            expiresAt,
            status: "active",
        },
    });

    // Create initial usage tracking rows for this period
    const periodEnd = new Date(expiresAt);
    await prisma.usageTracking.createMany({
        data: [
            { userId, type: "mock", usedCount: 0, periodStart: startedAt, periodEnd },
            { userId, type: "writing", usedCount: 0, periodStart: startedAt, periodEnd },
            { userId, type: "speaking", usedCount: 0, periodStart: startedAt, periodEnd },
        ],
        skipDuplicates: true,
    });

    // Update user's subscription tier
    await prisma.user.update({
        where: { id: userId },
        data: {
            subscriptionTier: "PRO",
            subscriptionExpiresAt: expiresAt,
        },
    });

    // Payment record
    await prisma.payment.create({
        data: {
            userId,
            amount,
            currency: "UZS",
            status: "COMPLETED",
            provider: "simulated",
            planId: "pro_monthly",
            paidAt: new Date(),
        },
    });

    res.json({
        success: true,
        message: "Pro obuna muvaffaqiyatli faollashtirildi!",
        subscription: {
            id: subscription.id,
            planType: subscription.planType,
            startedAt: subscription.startedAt.toISOString(),
            expiresAt: subscription.expiresAt.toISOString(),
            status: subscription.status,
        },
    });
});

// ═══════════════════════════════════════════════
// POST /usage/record – Record usage of a feature
// ═══════════════════════════════════════════════
router.post("/usage/record", authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    const parsed = z.object({
        type: z.enum(["mock", "writing", "speaking"]),
    }).safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ message: "type: 'mock' | 'writing' | 'speaking' kerak." });
        return;
    }

    const { type } = parsed.data;

    try {
        switch (type) {
            case "mock":
                await recordMockUsage(userId);
                break;
            case "writing":
                await recordWritingUsage(userId);
                break;
            case "speaking":
                await recordSpeakingUsage(userId);
                break;
        }

        // Return updated status
        const status = await getAccessStatus(userId);
        res.json({ success: true, status });
    } catch (error) {
        console.error("Usage recording error:", error);
        res.status(500).json({ message: "Foydalanish qayd etilmadi." });
    }
});

// ═══════════════════════════════════════════════
// POST /cancel – Cancel Pro subscription
// ═══════════════════════════════════════════════
router.post("/cancel", authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    await prisma.subscription.updateMany({
        where: { userId, status: "active" },
        data: { status: "cancelled" },
    });

    await prisma.user.update({
        where: { id: userId },
        data: {
            subscriptionTier: "FREE",
            subscriptionExpiresAt: null,
        },
    });

    res.json({ success: true, message: "Obuna bekor qilindi." });
});

export const accessRoutes = router;
