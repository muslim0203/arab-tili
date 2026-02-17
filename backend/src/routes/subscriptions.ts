import express, { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { getClickPayUrl, verifyPrepareSign, verifyCompleteSign } from "../lib/click.js";
import { config } from "../config.js";

const router = Router();

export const SUBSCRIPTION_PLANS = [
  { id: "premium", tier: "PREMIUM" as const, name: "Premium", nameUz: "Premium", durationMonths: 1, amount: 99_000, description: "AI Tutor 100 suhbat/oy" },
  { id: "intensive", tier: "INTENSIVE" as const, name: "Intensive", nameUz: "Intensive", durationMonths: 3, amount: 249_000, description: "AI Tutor cheksiz, 3 oy" },
] as const;

// GET /api/subscriptions/plans
router.get("/plans", (_req, res: Response) => {
  res.json({
    plans: SUBSCRIPTION_PLANS.map((p) => ({
      id: p.id,
      tier: p.tier,
      name: p.name,
      nameUz: p.nameUz,
      durationMonths: p.durationMonths,
      amount: p.amount,
      currency: "UZS",
      description: p.description,
    })),
  });
});

// POST /api/subscriptions/create-payment – auth, body: { planId }
router.post("/create-payment", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const parsed = z.object({ planId: z.enum(["premium", "intensive"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "planId: premium yoki intensive" });
    return;
  }
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === parsed.data.planId);
  if (!plan) {
    res.status(400).json({ message: "Bunday tarif yo‘q" });
    return;
  }
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: plan.amount,
      currency: "UZS",
      status: "PENDING",
      planId: plan.id,
    },
  });
  const returnUrl = `${config.frontendUrl}/payment/return?payment_id=${payment.id}`;
  const redirectUrl = getClickPayUrl({
    amount: plan.amount,
    merchantTransId: payment.id,
    returnUrl,
    merchantUserId: userId,
  });
  res.json({
    paymentId: payment.id,
    amount: plan.amount,
    currency: plan.currency,
    redirectUrl,
  });
});

function toInt(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") return parseInt(v, 10) || 0;
  return 0;
}
function toStr(v: unknown): string {
  return v != null ? String(v) : "";
}

// POST /api/subscriptions/click/prepare – Click callback (no auth)
router.post("/click/prepare", async (req: express.Request, res: Response) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const click_trans_id = toStr(body.click_trans_id);
  const service_id = toStr(body.service_id);
  const merchant_trans_id = toStr(body.merchant_trans_id);
  const amount = toStr(body.amount);
  const action = toStr(body.action);
  const sign_time = toStr(body.sign_time);
  const sign_string = toStr(body.sign_string);
  const error = toInt(body.error);

  if (error !== 0) {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -8,
      error_note: "Payment error from Click",
    });
  }

  if (!verifyPrepareSign({ click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string })) {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -1,
      error_note: "Invalid sign",
    });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: merchant_trans_id, status: "PENDING" },
  });
  if (!payment) {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -5,
      error_note: "Order not found",
    });
  }

  const amountNum = parseFloat(amount);
  if (Math.abs(amountNum - payment.amount) > 0.01) {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: 0,
      error: -2,
      error_note: "Amount mismatch",
    });
  }

  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    click_trans_id,
    merchant_trans_id,
    merchant_prepare_id: 1,
    error: 0,
    error_note: "Success",
  });
});

// POST /api/subscriptions/click/complete – Click callback (no auth)
router.post("/click/complete", async (req: express.Request, res: Response) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const click_trans_id = toStr(body.click_trans_id);
  const service_id = toStr(body.service_id);
  const merchant_trans_id = toStr(body.merchant_trans_id);
  const merchant_prepare_id = toStr(body.merchant_prepare_id);
  const amount = toStr(body.amount);
  const action = toStr(body.action);
  const sign_time = toStr(body.sign_time);
  const sign_string = toStr(body.sign_string);
  const error = toInt(body.error);

  if (error !== 0) {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: 0,
      error: -9,
      error_note: "Payment cancelled",
    });
  }

  if (!verifyCompleteSign({ click_trans_id, service_id, merchant_trans_id, merchant_prepare_id, amount, action, sign_time, sign_string })) {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: 0,
      error: -1,
      error_note: "Invalid sign",
    });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: merchant_trans_id },
  });
  if (!payment || payment.status === "COMPLETED") {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: payment?.status === "COMPLETED" ? 1 : 0,
      error: payment?.status === "COMPLETED" ? -4 : -5,
      error_note: payment?.status === "COMPLETED" ? "Already confirmed" : "Order not found",
    });
  }

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === payment.planId);
  if (!plan) {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: 0,
      error: -6,
      error_note: "Invalid plan",
    });
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + plan.durationMonths);

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED", paymentProviderId: click_trans_id, paidAt: new Date() },
    }),
    prisma.user.update({
      where: { id: payment.userId },
      data: {
        subscriptionTier: plan.tier,
        subscriptionExpiresAt: expiresAt,
      },
    }),
  ]);

  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    click_trans_id,
    merchant_trans_id,
    merchant_confirm_id: 1,
    error: 0,
    error_note: "Success",
  });
});

export const subscriptionRoutes = router;
