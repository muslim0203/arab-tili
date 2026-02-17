import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/progress/stats – dashboard statistikasi (imtihonlar, o‘rtacha ball, vaqt, 7 kun, ko‘nikmalar)
router.get("/stats", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const attempts = await prisma.userExamAttempt.findMany({
    where: { userId },
    orderBy: { completedAt: "desc" },
    take: 100,
    select: {
      status: true,
      completedAt: true,
      startedAt: true,
      percentage: true,
      sectionScores: true,
    },
  });

  const completed = attempts.filter((a) => a.status === "COMPLETED" && a.completedAt && a.percentage != null);
  const completedAttempts = attempts.filter((a) => a.status === "COMPLETED" && a.completedAt);

  const examsThisMonth = completedAttempts.filter((a) => a.completedAt && new Date(a.completedAt) >= startOfMonth).length;
  const examsLastMonth = completedAttempts.filter((a) => {
    const d = a.completedAt && new Date(a.completedAt);
    if (!d) return false;
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return d >= lm && d <= lmEnd;
  }).length;
  const examsThisMonthDiff = examsThisMonth - examsLastMonth;

  const avgScore = completed.length
    ? Math.round(completed.reduce((s, a) => s + (a.percentage ?? 0), 0) / completed.length)
    : 0;
  const last7 = completed.filter((a) => a.completedAt && new Date(a.completedAt) >= sevenDaysAgo);
  const prev7 = completed.filter((a) => {
    const d = a.completedAt && new Date(a.completedAt);
    if (!d) return false;
    const start = new Date(sevenDaysAgo);
    start.setDate(start.getDate() - 7);
    return d >= start && d < sevenDaysAgo;
  });
  const avgLast7 = last7.length ? last7.reduce((s, a) => s + (a.percentage ?? 0), 0) / last7.length : 0;
  const avgPrev7 = prev7.length ? prev7.reduce((s, a) => s + (a.percentage ?? 0), 0) / prev7.length : 0;
  const scoreGrowth = avgPrev7 > 0 ? Math.round(avgLast7 - avgPrev7) : 0;

  const studyMinutes = completedAttempts.reduce((sum, a) => {
    if (!a.completedAt || !a.startedAt) return sum;
    const mins = (new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime()) / (60 * 1000);
    return sum + mins;
  }, 0);
  const studyThisWeek = completedAttempts.filter((a) => a.completedAt && new Date(a.completedAt) >= startOfWeek).reduce((sum, a) => {
    if (!a.completedAt || !a.startedAt) return sum;
    return sum + (new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime()) / (60 * 1000);
  }, 0);

  const last7DaysData: { day: string; ball: number }[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    const dayAttempts = completed.filter((a) => {
      const t = a.completedAt && new Date(a.completedAt);
      return t && t >= dayStart && t <= dayEnd;
    });
    const dayAvg = dayAttempts.length
      ? Math.round(dayAttempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / dayAttempts.length)
      : 0;
    last7DaysData.push({ day: dayNames[d.getDay()], ball: dayAvg });
  }

  const progress = await prisma.userProgress.findUnique({
    where: { userId },
    select: { skillScores: true },
  });
  const skillScores = (progress?.skillScores as Record<string, number> | null) ?? null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  const tier = user?.subscriptionTier ?? "FREE";
  const aiCreditsMap: Record<string, number> = { FREE: 100, PREMIUM: 500, INTENSIVE: 1000 };
  const aiCredits = aiCreditsMap[tier] ?? 100;
  const aiCreditsRefreshDays = 7;

  res.json({
    examsTaken: completedAttempts.length,
    examsThisMonth,
    examsThisMonthDiff,
    averageScore: avgScore,
    scoreGrowth,
    totalStudyMinutes: Math.round(studyMinutes),
    studyMinutesThisWeek: Math.round(studyThisWeek),
    last7DaysData,
    skillScores,
    aiCredits,
    aiCreditsRefreshDays,
  });
});

// GET /api/progress – foydalanuvchi progressi (imtihonlar soni, CEFR, streak, oxirgi faoliyat)
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const progress = await prisma.userProgress.findUnique({
    where: { userId },
  });

  if (!progress) {
    return res.json({
      totalExamsTaken: 0,
      currentCefrEstimate: null,
      currentStreakDays: 0,
      skillScores: null,
      lastActivityAt: null,
    });
  }

  res.json({
    totalExamsTaken: progress.totalExamsTaken,
    currentCefrEstimate: progress.currentCefrEstimate,
    currentStreakDays: progress.currentStreakDays,
    skillScores: progress.skillScores,
    lastActivityAt: progress.lastActivityAt?.toISOString() ?? null,
  });
});

export const progressRoutes = router;
