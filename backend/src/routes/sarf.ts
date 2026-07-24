import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { canAccessFullSarf } from "../services/access-control.js";

const router = Router();

// ──────────────────────────────────────────────────
// GET /api/sarf/lessons — darslar ro'yxati (authed, hamma tarifga ochiq)
// ──────────────────────────────────────────────────
router.get("/lessons", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const [lessons, progressRows, access] = await Promise.all([
    prisma.sarfLesson.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.sarfLessonProgress.findMany({ where: { userId } }),
    canAccessFullSarf(userId),
  ]);

  const progressByLessonId = new Map(progressRows.map((p) => [p.lessonId, p]));

  const result = lessons.map((lesson) => {
    const progress = progressByLessonId.get(lesson.id);
    return {
      id: lesson.id,
      slug: lesson.slug,
      order: lesson.order,
      level: lesson.level,
      titleUz: lesson.titleUz,
      titleAr: lesson.titleAr,
      summary: lesson.summary,
      estMinutes: lesson.estMinutes,
      isFree: lesson.isFree,
      questionCount: lesson._count.questions,
      hasAccess: lesson.isFree || access.allowed,
      progress: {
        status: progress?.status ?? "not_started",
        bestScore: progress?.bestScore ?? 0,
        completedAt: progress?.completedAt ?? null,
      },
    };
  });

  res.json({ lessons: result });
});

// ──────────────────────────────────────────────────
// GET /api/sarf/lessons/:slug — dars detali
// ──────────────────────────────────────────────────
router.get("/lessons/:slug", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { slug } = req.params;

  const lesson = await prisma.sarfLesson.findUnique({
    where: { slug },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });

  if (!lesson || !lesson.isPublished) {
    res.status(404).json({ message: "Dars topilmadi" });
    return;
  }

  if (!lesson.isFree) {
    const access = await canAccessFullSarf(userId);
    if (!access.allowed) {
      res.status(403).json({
        message: access.reason,
        planType: access.planType,
        upgradeRequired: true,
      });
      return;
    }
  }

  const progress = await prisma.sarfLessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
  });

  res.json({
    lesson: {
      id: lesson.id,
      slug: lesson.slug,
      order: lesson.order,
      level: lesson.level,
      titleUz: lesson.titleUz,
      titleAr: lesson.titleAr,
      summary: lesson.summary,
      estMinutes: lesson.estMinutes,
      isFree: lesson.isFree,
      theory: JSON.parse(lesson.theory),
      conjugationTables: JSON.parse(lesson.conjugationTables),
      questions: lesson.questions.map((q) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        prompt: q.prompt,
        options: JSON.parse(q.options),
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      })),
      progress: {
        status: progress?.status ?? "not_started",
        bestScore: progress?.bestScore ?? 0,
        completedAt: progress?.completedAt ?? null,
      },
    },
  });
});

// ──────────────────────────────────────────────────
// POST /api/sarf/lessons/:slug/complete — darsni yakunlash
// ──────────────────────────────────────────────────
router.post("/lessons/:slug/complete", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { slug } = req.params;

  const lesson = await prisma.sarfLesson.findUnique({
    where: { slug },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });

  if (!lesson || !lesson.isPublished) {
    res.status(404).json({ message: "Dars topilmadi" });
    return;
  }

  if (!lesson.isFree) {
    const access = await canAccessFullSarf(userId);
    if (!access.allowed) {
      res.status(403).json({
        message: access.reason,
        planType: access.planType,
        upgradeRequired: true,
      });
      return;
    }
  }

  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length !== lesson.questions.length) {
    res.status(400).json({ message: "answers massivi savollar soniga mos emas" });
    return;
  }

  const total = lesson.questions.length;
  const score = lesson.questions.reduce((count, q, i) => {
    return answers[i] === q.correctIndex ? count + 1 : count;
  }, 0);

  const existingProgress = await prisma.sarfLessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
  });

  const now = new Date();
  const newBestScore = Math.max(existingProgress?.bestScore ?? 0, score);

  const progress = await prisma.sarfLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    create: {
      userId,
      lessonId: lesson.id,
      status: "completed",
      bestScore: score,
      completedAt: now,
    },
    update: {
      status: "completed",
      bestScore: newBestScore,
      completedAt: existingProgress?.completedAt ?? now,
    },
  });

  await prisma.userProgress.upsert({
    where: { userId },
    create: { userId, lastActivityAt: now },
    update: { lastActivityAt: now },
  });

  res.json({ score, total, bestScore: progress.bestScore });
});

export const sarfRoutes = router;
