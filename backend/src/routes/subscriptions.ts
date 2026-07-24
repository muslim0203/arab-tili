import express, { Router, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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

/**
 * To'lov provayderi to'liq sozlanganmi.
 *
 * Faqat maxfiy kalit emas, redirect URL'ini qurish uchun kerak bo'lgan
 * barcha qiymatlar tekshiriladi — aks holda foydalanuvchi bo'sh parametrli
 * buzuq to'lov sahifasiga tushadi.
 */
function isProviderConfigured(provider: "click" | "payme"): boolean {
  if (provider === "payme") {
    return Boolean(config.payme.merchantId && config.payme.merchantKey);
  }
  return Boolean(config.click.merchantId && config.click.serviceId && config.click.secretKey);
}

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
    // Frontend shu bo'yicha "sotib olish" tugmasini oldindan o'chirib qo'yishi
    // va sababini tushuntirishi mumkin — foydalanuvchi buzuq sahifaga tushmasin.
    providers: {
      click: isProviderConfigured("click"),
      payme: isProviderConfigured("payme"),
    },
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

  // To'lov provayderi sozlanmagan bo'lsa — DARHOL to'xtaymiz.
  //
  // Ilgari bu holatda ham PENDING yozuv yaratilib, foydalanuvchi bo'sh
  // merchant_id bilan qurilgan buzuq Click/Payme sahifasiga yo'naltirilardi:
  // tushuntirishsiz "o'lik" oyna va bazada keraksiz yozuvlar.
  if (!isProviderConfigured(provider)) {
    res.status(503).json({
      message: "To'lov tizimi hozircha ulanmagan. Iltimos, biz bilan bog'laning.",
      code: "PAYMENT_PROVIDER_UNCONFIGURED",
      provider,
    });
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

  // Eslatma: `status` unique maydon emas, shuning uchun findFirst ishlatiladi.
  const payment = await prisma.payment.findFirst({ where: { id: merchant_trans_id, status: "PENDING" } });
  if (!payment) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_prepare_id: 0,
      error: -5, error_note: "Order not found",
    });
  }

  // Summani serverdagi reja narxi bilan solishtirish (mijoz yuborgan summaga ishonmaymiz).
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === payment.planId);
  if (!plan || Math.abs(payment.amount - plan.amount) > 0.01) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_prepare_id: 0,
      error: -6, error_note: "Invalid plan",
    });
  }

  const amountNum = parseFloat(amount);
  if (Math.abs(amountNum - plan.amount) > 0.01) {
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
  if (!payment) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: 0,
      error: -5, error_note: "Order not found",
    });
  }

  // Idempotentlik: allaqachon yakunlangan bo'lsa, qayta faollashtirmaymiz.
  if (payment.status === "COMPLETED") {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: 1,
      error: -4, error_note: "Already confirmed",
    });
  }

  // Faqat PENDING holatdagi to'lov yakunlanishi mumkin (CANCELLED bo'lsa rad etiladi).
  if (payment.status !== "PENDING") {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: 0,
      error: -9, error_note: "Transaction cancelled",
    });
  }

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === payment.planId);
  if (!plan) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: 0,
      error: -6, error_note: "Invalid plan",
    });
  }

  // Summani qayta tekshirish (complete bosqichida ham).
  const amountNum = parseFloat(amount);
  if (Math.abs(amountNum - plan.amount) > 0.01 || Math.abs(payment.amount - plan.amount) > 0.01) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: 0,
      error: -2, error_note: "Amount mismatch",
    });
  }

  // Yagona bajarilishni kafolatlash: faqat PENDING -> COMPLETED ni atomik o'tkazamiz.
  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: "PENDING" },
    data: { status: "COMPLETED", paymentProviderId: click_trans_id, paidAt: new Date() },
  });

  if (claimed.count !== 1) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: 1,
      error: -4, error_note: "Already confirmed",
    });
  }

  try {
    await activateSubscription(payment.id, payment.userId, plan);
  } catch (e) {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "COMPLETED" },
      data: { status: "PENDING", paidAt: null },
    });
    console.error("[Click] activateSubscription xatosi:", (e as Error).message);
    return res.status(200).json({
      click_trans_id, merchant_trans_id, merchant_confirm_id: 0,
      error: -7, error_note: "Activation failed",
    });
  }

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

  // Atomik idempotentlik: state 1 → 2 o'tishini FAQAT bitta so'rov qo'lga kiritadi.
  // Ilgari ikki parallel PerformTransaction ham paymeState===1 ni o'qib,
  // activateSubscription ni IKKI marta chaqirardi — obuna ikki marta faollashardi.
  // Endi updateMany({ paymeState: 1 }) shartli da'vo qiladi; faqat g'olib (count===1)
  // obunani faollashtiradi. Payment o'zgartirishi + faollashtirish bitta
  // tranzaksiyada — biri xato bo'lsa, ikkalasi ham qaytariladi (Payme qayta uradi).
  const performTime = new Date();
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === payment.planId);
  let won = false;
  await prisma.$transaction(async (tx) => {
    const claim = await tx.payment.updateMany({
      where: { id: payment.id, paymeState: 1 },
      data: {
        paymeState: 2,
        status: "COMPLETED",
        paymePerformTime: performTime,
        paidAt: performTime,
      },
    });
    if (claim.count === 0) return; // boshqa so'rov allaqachon bajardi
    won = true;
    if (plan) {
      await activateSubscription(payment.id, payment.userId, plan, tx);
    }
  });

  if (!won) {
    // Poygada yutqazdik — boshqa so'rov bajardi. Payme uchun muvaffaqiyat javobi.
    const fresh = await prisma.payment.findUnique({ where: { id: payment.id } });
    return res.status(200).json(paymeJsonRpcResult(id, {
      transaction: fresh?.paymeTransId ?? payment.paymeTransId,
      perform_time: fresh?.paymePerformTime?.getTime() ?? performTime.getTime(),
      state: fresh?.paymeState ?? 2,
    }));
  }

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
    // Obunani FREE ga qaytarish + active subscription / purchase larni bekor qilish.
    // Aks holda getActiveSubscription hali ham PRO ruxsat berib qoladi.
    await prisma.subscription.updateMany({
      where: { userId: payment.userId, status: "active" },
      data: { status: "cancelled" },
    });
    if (payment.planId === "mock_exam") {
      await prisma.purchase.updateMany({
        where: { userId: payment.userId, productType: "mock_exam", remainingUses: { gt: 0 } },
        data: { remainingUses: 0 },
      });
    }
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
// Eksport qilingan, chunki admin panel ham (qo'lda faollashtirish) AYNAN shu
// yo'ldan borishi kerak — aks holda to'lov orqali va qo'lda ochilgan obunalar
// boshqa-boshqa holatda bo'lib qoladi (usageTracking, subscriptionTier va h.k.).
/**
 * Obunani/xaridni faollashtirish.
 *
 * Barcha yozuvlar bitta tranzaksiyada bajariladi — ilgari 5 ta alohida yozuv
 * edi va o'rtada xato bo'lsa yarim-faol holat qolardi. `tx` berilsa, chaqiruvchi
 * tranzaksiyasida ishlaydi (Payme perform atomik da'vosi bilan birga commit
 * bo'lishi uchun); aks holda o'zining tranzaksiyasini ochadi.
 */
export async function activateSubscription(
  paymentId: string,
  userId: string,
  plan: (typeof SUBSCRIPTION_PLANS)[number],
  tx?: Prisma.TransactionClient,
) {
  const run = async (db: Prisma.TransactionClient) => {
    if (plan.id === "mock_exam") {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await db.purchase.create({
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
      await db.subscription.updateMany({
        where: { userId, status: "active" },
        data: { status: "cancelled" },
      });

      await db.subscription.create({
        data: {
          userId,
          planType: "pro",
          startedAt,
          expiresAt,
          status: "active",
        },
      });

      await db.usageTracking.createMany({
        data: [
          { userId, type: "mock" as const, usedCount: 0, periodStart: startedAt, periodEnd: expiresAt },
          { userId, type: "writing" as const, usedCount: 0, periodStart: startedAt, periodEnd: expiresAt },
          { userId, type: "speaking" as const, usedCount: 0, periodStart: startedAt, periodEnd: expiresAt },
          { userId, type: "aiTutor" as const, usedCount: 0, periodStart: startedAt, periodEnd: expiresAt },
        ],
      });

      await db.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: "PRO",
          subscriptionExpiresAt: expiresAt,
        },
      });
    }
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

export const subscriptionRoutes = router;
