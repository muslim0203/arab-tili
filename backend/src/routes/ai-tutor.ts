import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rate-limit.js";
import { chatWithTutor } from "../services/ai-tutor.js";
import {
  canUseAITutor,
  recordAITutorUsage,
  getUserPlanType,
  PRO_LIMITS,
} from "../services/access-control.js";

const router = Router();

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/ai-tutor/quota – oylik limit va ishlatilgan (yangi access-control tizimi)
router.get("/quota", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const planType = await getUserPlanType(userId);
  const accessResult = await canUseAITutor(userId);

  // Pro users get their usage from access control
  if (planType === "pro") {
    const start = startOfMonth(new Date());
    const usage = await prisma.usageTracking.findFirst({
      where: {
        userId,
        type: "aiTutor",
        periodStart: { gte: start },
      },
    });

    res.json({
      used: usage?.usedCount ?? 0,
      limit: PRO_LIMITS.aiTutor,
      tier: "PRO",
      allowed: accessResult.allowed,
    });
    return;
  }

  // Free/Standard users: AI Tutor not available
  res.json({
    used: 0,
    limit: 0,
    tier: planType.toUpperCase(),
    allowed: false,
    reason: accessResult.reason,
  });
});

// POST /api/ai-tutor/chat – xabar yuborish, AI javob
router.post("/chat", authenticateToken, aiLimiter, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const parsed = z.object({ message: z.string().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "message kerak (1–2000 belgi)" });
    return;
  }
  const { message } = parsed.data;

  // Check access using new access control system
  const accessResult = await canUseAITutor(userId);
  if (!accessResult.allowed) {
    res.status(403).json({
      message: accessResult.reason,
      planType: accessResult.planType,
      upgradeRequired: true,
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { languagePreference: true },
  });

  const progress = await prisma.userProgress.findUnique({
    where: { userId },
    select: { currentCefrEstimate: true },
  });

  try {
    const { response, tokensUsed } = await chatWithTutor(
      message,
      user?.languagePreference ?? "uz",
      progress?.currentCefrEstimate ?? null
    );

    const conv = await prisma.aITutorConversation.create({
      data: {
        userId,
        questionAsked: message,
        aiResponse: response,
        tokensUsed: tokensUsed ?? undefined,
      },
    });

    // Record usage in access control system
    await recordAITutorUsage(userId);

    // Get updated quota info
    const start = startOfMonth(new Date());
    const usage = await prisma.usageTracking.findFirst({
      where: {
        userId,
        type: "aiTutor",
        periodStart: { gte: start },
      },
    });

    res.json({
      id: conv.id,
      questionAsked: conv.questionAsked,
      aiResponse: conv.aiResponse,
      createdAt: conv.createdAt,
      used: usage?.usedCount ?? 1,
      limit: PRO_LIMITS.aiTutor,
    });
  } catch (e) {
    res.status(503).json({
      message: e instanceof Error ? e.message : "AI tutor javob bermadi",
    });
  }
});

// GET /api/ai-tutor/history – paginated tarix
router.get("/history", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(50, Math.max(10, parseInt(String(req.query.pageSize), 10) || 20));
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.aITutorConversation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.aITutorConversation.count({ where: { userId } }),
  ]);

  res.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

export const aiTutorRoutes = router;
