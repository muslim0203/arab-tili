import express, { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { getClickPayUrl, verifyPrepareSign, verifyCompleteSign } from "../lib/click.js";
import {
  getPaymeCheckoutUrl,
  verifyPaymeAuth,
  PaymeError,
  paymeJsonRpcError,
  paymeJsonRpcResult,
} from "../lib/payme.js";
import { config } from "../config.js";

const router = Router();

export const SUBSCRIPTION_PLANS = [
  { id: "mock_exam", type: "purchase", durationMonths: 0, amount: 50_000, description: "1 ta to'liq imtihon (7 kun)", name: "Mock Imtihon", nameUz: "Mock Imtihon", tier: "MOCK" as const },
  { id: "pro_basic", type: "subscription", planType: "pro", durationMonths: 1, amount: 89_000, description: "Pro aylik obuna", name: "Pro Asosiy", nameUz: "Pro Asosiy", tier: "PRO" as const },
  { id: "pro_premium", type: "subscription", planType: "pro", durationMonths: 1, amount: 119_000, description: "Pro yillik/premium", name: "Pro Premium", nameUz: "Pro Premium", tier: "PRO" as const },
] as const;

// ════════════════════════════════════════════
// PLANS
// ════════════════════════════════════════════
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

// ════════════════════════════════════════════
// CREATE PAYMENT – Click yoki Payme
// ════════════════════════════════════════════
router.post("/create-payment", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const parsed = z.object({
    planId: z.enum(["mock_exam", "pro_basic", "pro_premium"]),
    provider: z.enum(["click", "payme"]).default("click"),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "planId: premium yoki intensive, provider: click yoki payme" });
    return;
  }

  const { planId, provider } = parsed.data;
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  if (!plan) {
    res.status(400).json({ message: "Bunday tarif yo'q" });
    return;
  }

  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: plan.amount,
      currency: "UZS",
      status: "PENDING",
      provider,
      planId: plan.id,
    },
  });

  const returnUrl = `${config.frontendUrl}/payment/return?payment_id=${payment.id}`;

  let redirectUrl: string;

  if (provider === "payme") {
    redirectUrl = getPaymeCheckoutUrl({
      amount: plan.amount,
      orderId: payment.id,
      returnUrl,
    });
  } else {
    redirectUrl = getClickPayUrl({
      amount: plan.amount,
      merchantTransId: payment.id,
      returnUrl,
      merchantUserId: userId,
    });
  }

  res.json({
    paymentId: payment.id,
    amount: plan.amount,
    currency: "UZS",
    provider,
    redirectUrl,
  });
});

// ════════════════════════════════════════════
// CLICK CALLBACKS (prepare / complete)
// ════════════════════════════════════════════

function toInt(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") return parseInt(v, 10) || 0;
  return 0;
}
function toStr(v: unknown): string {
  return v != null ? String(v) : "";
}

// POST /api/subscriptions/click/prepare
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
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_prepare_id: 0,
      error: -8, error_note: "Payment error from Click",
    });
  }

  if (!verifyPrepareSign({ click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string })) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_prepare_id: 0,
      error: -1, error_note: "Invalid sign",
    });
  }

  const payment = await prisma.payment.findUnique({ where: { id: merchant_trans_id, status: "PENDING" } });
  if (!payment) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_prepare_id: 0,
      error: -5, error_note: "Order not found",
    });
  }

  const amountNum = parseFloat(amount);
  if (Math.abs(amountNum - payment.amount) > 0.01) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_prepare_id: 0,
      error: -2, error_note: "Amount mismatch",
    });
  }

  res.status(200).json({
    click_trans_id, merchant_trans_id, merchant_prepare_id: 1,
    error: 0, error_note: "Success",
  });
});

// POST /api/subscriptions/click/complete
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
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: 0,
      error: -9, error_note: "Payment cancelled",
    });
  }

  if (!verifyCompleteSign({ click_trans_id, service_id, merchant_trans_id, merchant_prepare_id, amount, action, sign_time, sign_string })) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: 0,
      error: -1, error_note: "Invalid sign",
    });
  }

  const payment = await prisma.payment.findUnique({ where: { id: merchant_trans_id } });
  if (!payment || payment.status === "COMPLETED") {
    return res.status(200).json({
      click_trans_id, merchant_trans_id,
      merchant_confirm_id: payment?.status === "COMPLETED" ? 1 : 0,
      error: payment?.status === "COMPLETED" ? -4 : -5,
      error_note: payment?.status === "COMPLETED" ? "Already confirmed" : "Order not found",
    });
  }

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === payment.planId);
  if (!plan) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: 0,
      error: -6, error_note: "Invalid plan",
    });
  }

  await activateSubscription(payment.id, payment.userId, plan);

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "COMPLETED", paymentProviderId: click_trans_id, paidAt: new Date() },
  });

  res.status(200).json({
    click_trans_id, merchant_trans_id, merchant_confirm_id: 1,
    error: 0, error_note: "Success",
  });
});


// ════════════════════════════════════════════
// PAYME JSON-RPC CALLBACK ENDPOINT
// ════════════════════════════════════════════

// Payme timeout: 12 soat (ms da)
const PAYME_TIMEOUT_MS = 43_200_000;

router.post("/payme/callback", async (req: express.Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const body = req.body || {};
  const { id, method, params } = body;

  // Basic auth tekshirish
  if (!verifyPaymeAuth(authHeader)) {
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.Unauthorized));
  }

  try {
    switch (method) {
      case "CheckPerformTransaction":
        return await handleCheckPerformTransaction(id, params, res);
      case "CreateTransaction":
        return await handleCreateTransaction(id, params, res);
      case "PerformTransaction":
        return await handlePerformTransaction(id, params, res);
      case "CancelTransaction":
        return await handleCancelTransaction(id, params, res);
      case "CheckTransaction":
        return await handleCheckTransaction(id, params, res);
      case "GetStatement":
        return await handleGetStatement(id, params, res);
      default:
        return res.status(200).json(paymeJsonRpcError(id, PaymeError.MethodNotFound));
    }
  } catch (e) {
    console.error("Payme callback error:", e);
    return res.status(200).json(paymeJsonRpcError(id, {
      code: -31008,
      message: { uz: "Server xatosi", ru: "Ошибка сервера", en: "Server error" },
    }));
  }
});

// ── CheckPerformTransaction ──
async function handleCheckPerformTransaction(id: unknown, params: any, res: Response) {
  const orderId = params?.account?.order_id;
  const amount = params?.amount; // tiyinda (so'm × 100)

  if (!orderId) {
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.OrderNotFound));
  }

  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment) {
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.OrderNotFound));
  }

  // Summani tekshirish (Payme tiyinda yuboradi)
  const expectedTiyin = payment.amount * 100;
  if (amount !== expectedTiyin) {
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.InvalidAmount));
  }

  if (payment.status !== "PENDING") {
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.CantPerform));
  }

  return res.status(200).json(paymeJsonRpcResult(id, { allow: true }));
}

// ── CreateTransaction ──
async function handleCreateTransaction(id: unknown, params: any, res: Response) {
  const paymeTransId = params?.id;
  const orderId = params?.account?.order_id;
  const amount = params?.amount;
  const time = params?.time;

  // Allaqachon mavjud tranzaksiya
  const existing = await prisma.payment.findFirst({ where: { paymeTransId } });
  if (existing) {
    if (existing.paymeState === 1) {
      // Timeout tekshirish
      const createdMs = existing.paymeCreateTime ? existing.paymeCreateTime.getTime() : 0;
      if (Date.now() - createdMs > PAYME_TIMEOUT_MS) {
        await prisma.payment.update({
          where: { id: existing.id },
          data: { paymeState: -1, status: "CANCELLED", paymeCancelTime: new Date(), cancelReason: 4 },
        });
        return res.status(200).json(paymeJsonRpcError(id, PaymeError.CantPerform));
      }
      return res.status(200).json(paymeJsonRpcResult(id, {
        create_time: createdMs,
        transaction: existing.paymeTransId,
        state: existing.paymeState,
      }));
    }
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.CantPerform));
  }

  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment || payment.status !== "PENDING") {
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.OrderNotFound));
  }

  const expectedTiyin = payment.amount * 100;
  if (amount !== expectedTiyin) {
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.InvalidAmount));
  }

  const createTime = new Date(time);
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paymeTransId,
      paymeState: 1,
      paymeCreateTime: createTime,
    },
  });

  return res.status(200).json(paymeJsonRpcResult(id, {
    create_time: createTime.getTime(),
    transaction: paymeTransId,
    state: 1,
  }));
}

// ── PerformTransaction ──
async function handlePerformTransaction(id: unknown, params: any, res: Response) {
  const paymeTransId = params?.id;

  const payment = await prisma.payment.findFirst({ where: { paymeTransId } });
  if (!payment) {
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.TransactionNotFound));
  }

  if (payment.paymeState === 2) {
    // Already performed
    return res.status(200).json(paymeJsonRpcResult(id, {
      transaction: payment.paymeTransId,
      perform_time: payment.paymePerformTime?.getTime() ?? 0,
      state: 2,
    }));
  }

  if (payment.paymeState !== 1) {
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.CantPerform));
  }

  // Timeout tekshirish
  const createdMs = payment.paymeCreateTime ? payment.paymeCreateTime.getTime() : 0;
  if (Date.now() - createdMs > PAYME_TIMEOUT_MS) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymeState: -1, status: "CANCELLED", paymeCancelTime: new Date(), cancelReason: 4 },
    });
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.CantPerform));
  }

  // Obunani faollashtirish
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === payment.planId);
  if (plan) {
    await activateSubscription(payment.id, payment.userId, plan);
  }

  const performTime = new Date();
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paymeState: 2,
      status: "COMPLETED",
      paymePerformTime: performTime,
      paidAt: performTime,
    },
  });

  return res.status(200).json(paymeJsonRpcResult(id, {
    transaction: payment.paymeTransId,
    perform_time: performTime.getTime(),
    state: 2,
  }));
}

// ── CancelTransaction ──
async function handleCancelTransaction(id: unknown, params: any, res: Response) {
  const paymeTransId = params?.id;
  const reason = params?.reason;

  const payment = await prisma.payment.findFirst({ where: { paymeTransId } });
  if (!payment) {
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.TransactionNotFound));
  }

  if (payment.paymeState === 1) {
    // Cancel before perform
    const cancelTime = new Date();
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymeState: -1,
        status: "CANCELLED",
        paymeCancelTime: cancelTime,
        cancelReason: reason,
      },
    });
    return res.status(200).json(paymeJsonRpcResult(id, {
      transaction: payment.paymeTransId,
      cancel_time: cancelTime.getTime(),
      state: -1,
    }));
  }

  if (payment.paymeState === 2) {
    // Cancel after perform — obunani bekor qilish
    const cancelTime = new Date();
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymeState: -2,
        status: "CANCELLED",
        paymeCancelTime: cancelTime,
        cancelReason: reason,
      },
    });
    // Obunani FREE ga qaytarish
    await prisma.user.update({
      where: { id: payment.userId },
      data: { subscriptionTier: "FREE", subscriptionExpiresAt: null },
    });
    return res.status(200).json(paymeJsonRpcResult(id, {
      transaction: payment.paymeTransId,
      cancel_time: cancelTime.getTime(),
      state: -2,
    }));
  }

  // Already cancelled
  return res.status(200).json(paymeJsonRpcResult(id, {
    transaction: payment.paymeTransId,
    cancel_time: payment.paymeCancelTime?.getTime() ?? 0,
    state: payment.paymeState,
  }));
}

// ── CheckTransaction ──
async function handleCheckTransaction(id: unknown, params: any, res: Response) {
  const paymeTransId = params?.id;

  const payment = await prisma.payment.findFirst({ where: { paymeTransId } });
  if (!payment) {
    return res.status(200).json(paymeJsonRpcError(id, PaymeError.TransactionNotFound));
  }

  return res.status(200).json(paymeJsonRpcResult(id, {
    create_time: payment.paymeCreateTime?.getTime() ?? 0,
    perform_time: payment.paymePerformTime?.getTime() ?? 0,
    cancel_time: payment.paymeCancelTime?.getTime() ?? 0,
    transaction: payment.paymeTransId,
    state: payment.paymeState ?? 0,
    reason: payment.cancelReason ?? null,
  }));
}

// ── GetStatement ──
async function handleGetStatement(id: unknown, params: any, res: Response) {
  const from = params?.from;
  const to = params?.to;

  const payments = await prisma.payment.findMany({
    where: {
      provider: "payme",
      paymeCreateTime: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    orderBy: { paymeCreateTime: "asc" },
  });

  const transactions = payments.map((p) => ({
    id: p.paymeTransId,
    time: p.paymeCreateTime?.getTime() ?? 0,
    amount: p.amount * 100,
    account: { order_id: p.id },
    create_time: p.paymeCreateTime?.getTime() ?? 0,
    perform_time: p.paymePerformTime?.getTime() ?? 0,
    cancel_time: p.paymeCancelTime?.getTime() ?? 0,
    transaction: p.paymeTransId,
    state: p.paymeState ?? 0,
    reason: p.cancelReason ?? null,
  }));

  return res.status(200).json(paymeJsonRpcResult(id, { transactions }));
}


// ════════════════════════════════════════════
// SHARED: Activate subscription
// ════════════════════════════════════════════
async function activateSubscription(
  paymentId: string,
  userId: string,
  plan: (typeof SUBSCRIPTION_PLANS)[number],
) {
  if (plan.id === "mock_exam") {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.purchase.create({
      data: {
        userId,
        productType: "mock_exam",
        quantity: 1,
        remainingUses: 1,
        expiresAt,
      },
    });
  } else {
    // Pro subscription
    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Cancel existing active subscription
    await prisma.subscription.updateMany({
      where: { userId, status: "active" },
      data: { status: "cancelled" },
    });

    await prisma.subscription.create({
      data: {
        userId,
        planType: "pro",
        startedAt,
        expiresAt,
        status: "active",
      },
    });

    await prisma.usageTracking.createMany({
      data: [
        { userId, type: "mock" as const, usedCount: 0, periodStart: startedAt, periodEnd: expiresAt },
        { userId, type: "writing" as const, usedCount: 0, periodStart: startedAt, periodEnd: expiresAt },
        { userId, type: "speaking" as const, usedCount: 0, periodStart: startedAt, periodEnd: expiresAt },
        { userId, type: "aiTutor" as const, usedCount: 0, periodStart: startedAt, periodEnd: expiresAt },
      ],
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: "PRO",
        subscriptionExpiresAt: expiresAt,
      },
    });
  }
}

export const subscriptionRoutes = router;
