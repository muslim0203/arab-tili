import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { chatWithTutor } from "../services/ai-tutor.js";

const router = Router();

const QUOTA: Record<string, number> = {
  FREE: 0,
  PREMIUM: 100,
  INTENSIVE: 99999,
};

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getMonthlyUsage(userId: string): Promise<number> {
  const start = startOfMonth(new Date());
  const count = await prisma.aITutorConversation.count({
    where: { userId, createdAt: { gte: start } },
  });
  return count;
}

function effectiveTier(tier: string, expiresAt: Date | null): string {
  if (!expiresAt || new Date() <= expiresAt) return tier;
  return "FREE";
}

// GET /api/ai-tutor/quota – oylik limit va ishlatilgan
router.get("/quota", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, subscriptionExpiresAt: true },
  });
  const tier = effectiveTier(user?.subscriptionTier ?? "FREE", user?.subscriptionExpiresAt ?? null);
  const limit = QUOTA[tier] ?? 0;
  const used = await getMonthlyUsage(userId);
  res.json({ used, limit, tier });
});

// POST /api/ai-tutor/chat – xabar yuborish, AI javob
router.post("/chat", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const parsed = z.object({ message: z.string().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "message kerak (1–2000 belgi)" });
    return;
  }
  const { message } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, subscriptionExpiresAt: true, languagePreference: true },
  });
  const tier = effectiveTier(user?.subscriptionTier ?? "FREE", user?.subscriptionExpiresAt ?? null);
  const limit = QUOTA[tier] ?? 0;
  const used = await getMonthlyUsage(userId);
  if (used >= limit) {
    res.status(403).json({
      message: "Oylik limit tugadi. Premium yoki Intensive tarifga o'ting.",
      used,
      limit,
    });
    return;
  }

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

    res.json({
      id: conv.id,
      questionAsked: conv.questionAsked,
      aiResponse: conv.aiResponse,
      createdAt: conv.createdAt,
      used: used + 1,
      limit,
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
