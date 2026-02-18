import { Router, Response } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, requireAdmin, type AuthRequest } from "../middleware/auth.js";

const router = Router();

// ── Audio upload setup ──
const audioUploadDir = path.join(process.cwd(), "uploads", "audio");
if (!fs.existsSync(audioUploadDir)) fs.mkdirSync(audioUploadDir, { recursive: true });

const audioUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, audioUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".mp3";
      const name = `${crypto.randomBytes(8).toString("hex")}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(mp3|m4a|wav|ogg|webm|mpga|mpeg)$/i.test(file.originalname) || file.mimetype?.startsWith("audio/");
    cb(null, !!allowed);
  },
});

router.use(authenticateToken, requireAdmin);

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

// ══════════════════════════════════════════════════
// AUDIO UPLOAD
// ══════════════════════════════════════════════════

router.post("/upload-audio", audioUpload.single("audio"), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: "audio fayl yuborilmadi" });
    return;
  }
  const audioUrl = `/api/uploads/audio/${req.file.filename}`;
  res.json({ audioUrl });
});

// ══════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════

router.get("/stats", async (_req: AuthRequest, res: Response) => {
  const [
    usersCount,
    attemptsCount,
    completedAttempts,
    paymentsCompleted,
    totalRevenue,
    grammarCount,
    readingPassageCount,
    listeningStageCount,
    writingTaskCount,
    speakingTaskCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.userExamAttempt.count(),
    prisma.userExamAttempt.count({ where: { status: "COMPLETED" } }),
    prisma.payment.count({ where: { status: "COMPLETED" } }),
    prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.grammarQuestion.count(),
    prisma.readingPassage.count(),
    prisma.listeningStage.count(),
    prisma.writingTask.count(),
    prisma.speakingTask.count(),
  ]);
  res.json({
    usersCount,
    attemptsCount,
    completedAttempts,
    paymentsCompleted,
    totalRevenue: totalRevenue._sum.amount ?? 0,
    questionBank: {
      grammar: grammarCount,
      readingPassages: readingPassageCount,
      listeningStages: listeningStageCount,
      writingTasks: writingTaskCount,
      speakingTasks: speakingTaskCount,
    },
  });
});

// ══════════════════════════════════════════════════
// USERS (existing)
// ══════════════════════════════════════════════════

router.get("/users", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(String(req.query.pageSize), 10) || 20));
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      skip, take: pageSize, orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, fullName: true, subscriptionTier: true,
        subscriptionExpiresAt: true, isAdmin: true, lastLogin: true, createdAt: true,
        _count: { select: { attempts: true, payments: true } },
      },
    }),
    prisma.user.count(),
  ]);
  res.json({
    items: items.map((u) => ({
      id: u.id, email: u.email, fullName: u.fullName,
      subscriptionTier: u.subscriptionTier,
      subscriptionExpiresAt: u.subscriptionExpiresAt?.toISOString() ?? null,
      isAdmin: u.isAdmin,
      lastLogin: u.lastLogin?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      attemptsCount: u._count.attempts,
      paymentsCount: u._count.payments,
    })),
    total, page, pageSize, totalPages: Math.ceil(total / pageSize),
  });
});

// ══════════════════════════════════════════════════
// PAYMENTS (existing)
// ══════════════════════════════════════════════════

router.get("/payments", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(String(req.query.pageSize), 10) || 20));
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      skip, take: pageSize, orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    }),
    prisma.payment.count(),
  ]);
  res.json({
    items: items.map((p) => ({
      id: p.id, userId: p.userId, userEmail: p.user.email, userFullName: p.user.fullName,
      amount: p.amount, currency: p.currency, status: p.status, planId: p.planId,
      paymentProviderId: p.paymentProviderId,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    total, page, pageSize, totalPages: Math.ceil(total / pageSize),
  });
});

// ══════════════════════════════════════════════════
// GRAMMAR QUESTIONS CRUD
// ══════════════════════════════════════════════════

router.get("/grammar", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize), 10) || 20));
  const level = req.query.level as string | undefined;
  const skip = (page - 1) * pageSize;
  const where: { level?: string } = {};
  if (level && CEFR_LEVELS.includes(level as typeof CEFR_LEVELS[number])) where.level = level;

  const [items, total] = await Promise.all([
    prisma.grammarQuestion.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
    prisma.grammarQuestion.count({ where }),
  ]);
  res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

router.get("/grammar/:id", async (req: AuthRequest, res: Response) => {
  const item = await prisma.grammarQuestion.findUnique({ where: { id: req.params.id } });
  if (!item) { res.status(404).json({ message: "Topilmadi" }); return; }
  res.json(item);
});

router.post("/grammar", async (req: AuthRequest, res: Response) => {
  const { level, prompt, optionA, optionB, optionC, optionD, correctIndex, tags } = req.body;
  if (!level || !prompt || !optionA || !optionB || !optionC || !optionD || correctIndex === undefined) {
    res.status(400).json({ message: "Barcha maydonlar to'ldirilishi shart" }); return;
  }
  const created = await prisma.grammarQuestion.create({
    data: { level, prompt, optionA, optionB, optionC, optionD, correctIndex: Number(correctIndex), tags: tags ? JSON.stringify(tags) : null },
  });
  res.status(201).json(created);
});

router.put("/grammar/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.grammarQuestion.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  const { level, prompt, optionA, optionB, optionC, optionD, correctIndex, tags } = req.body;
  const updated = await prisma.grammarQuestion.update({
    where: { id: req.params.id },
    data: {
      ...(level !== undefined && { level }),
      ...(prompt !== undefined && { prompt }),
      ...(optionA !== undefined && { optionA }),
      ...(optionB !== undefined && { optionB }),
      ...(optionC !== undefined && { optionC }),
      ...(optionD !== undefined && { optionD }),
      ...(correctIndex !== undefined && { correctIndex: Number(correctIndex) }),
      ...(tags !== undefined && { tags: tags ? JSON.stringify(tags) : null }),
    },
  });
  res.json(updated);
});

router.delete("/grammar/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.grammarQuestion.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  await prisma.grammarQuestion.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ══════════════════════════════════════════════════
// READING PASSAGES CRUD (with nested questions)
// ══════════════════════════════════════════════════

router.get("/reading", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize), 10) || 20));
  const level = req.query.level as string | undefined;
  const skip = (page - 1) * pageSize;
  const where: { level?: string } = {};
  if (level && CEFR_LEVELS.includes(level as typeof CEFR_LEVELS[number])) where.level = level;

  const [items, total] = await Promise.all([
    prisma.readingPassage.findMany({
      where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    }),
    prisma.readingPassage.count({ where }),
  ]);
  res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

router.get("/reading/:id", async (req: AuthRequest, res: Response) => {
  const item = await prisma.readingPassage.findUnique({
    where: { id: req.params.id },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!item) { res.status(404).json({ message: "Topilmadi" }); return; }
  res.json(item);
});

router.post("/reading", async (req: AuthRequest, res: Response) => {
  const { level, passageType, text, readingTimeSeconds, questionTimeSeconds, questions } = req.body;
  if (!level || !passageType || !text) {
    res.status(400).json({ message: "level, passageType, text to'ldirilishi shart" }); return;
  }
  const created = await prisma.readingPassage.create({
    data: {
      level, passageType, text,
      readingTimeSeconds: Number(readingTimeSeconds),
      questionTimeSeconds: Number(questionTimeSeconds),
      questions: questions?.length ? {
        create: (questions as Array<{ prompt: string; optionA: string; optionB: string; optionC: string; optionD: string; correctIndex: number }>)
          .map((q, i) => ({
            prompt: q.prompt, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
            correctIndex: Number(q.correctIndex), orderIndex: i,
          })),
      } : undefined,
    },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  res.status(201).json(created);
});

router.put("/reading/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.readingPassage.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  const { level, passageType, text, readingTimeSeconds, questionTimeSeconds, questions } = req.body;

  // If questions provided, delete old ones and create new
  if (questions) {
    await prisma.readingQuestion.deleteMany({ where: { passageId: req.params.id } });
  }

  const updated = await prisma.readingPassage.update({
    where: { id: req.params.id },
    data: {
      ...(level !== undefined && { level }),
      ...(passageType !== undefined && { passageType }),
      ...(text !== undefined && { text }),
      ...(readingTimeSeconds !== undefined && { readingTimeSeconds: Number(readingTimeSeconds) }),
      ...(questionTimeSeconds !== undefined && { questionTimeSeconds: Number(questionTimeSeconds) }),
      ...(questions && {
        questions: {
          create: (questions as Array<{ prompt: string; optionA: string; optionB: string; optionC: string; optionD: string; correctIndex: number }>)
            .map((q, i) => ({
              prompt: q.prompt, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
              correctIndex: Number(q.correctIndex), orderIndex: i,
            })),
        },
      }),
    },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  res.json(updated);
});

router.delete("/reading/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.readingPassage.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  await prisma.readingPassage.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ══════════════════════════════════════════════════
// LISTENING STAGES CRUD (with nested questions)
// ══════════════════════════════════════════════════

router.get("/listening", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize), 10) || 20));
  const level = req.query.level as string | undefined;
  const skip = (page - 1) * pageSize;
  const where: { level?: string } = {};
  if (level && CEFR_LEVELS.includes(level as typeof CEFR_LEVELS[number])) where.level = level;

  const [items, total] = await Promise.all([
    prisma.listeningStage.findMany({
      where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    }),
    prisma.listeningStage.count({ where }),
  ]);
  res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

router.get("/listening/:id", async (req: AuthRequest, res: Response) => {
  const item = await prisma.listeningStage.findUnique({
    where: { id: req.params.id },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!item) { res.status(404).json({ message: "Topilmadi" }); return; }
  res.json(item);
});

router.post("/listening", async (req: AuthRequest, res: Response) => {
  const { level, stageType, titleArabic, audioUrl, maxPlays, timeMode, perQuestionSeconds, totalSeconds, questions } = req.body;
  if (!level || !stageType || !titleArabic || !audioUrl || !timeMode) {
    res.status(400).json({ message: "level, stageType, titleArabic, audioUrl, timeMode to'ldirilishi shart" }); return;
  }
  const created = await prisma.listeningStage.create({
    data: {
      level, stageType, titleArabic, audioUrl,
      maxPlays: Number(maxPlays ?? 2), timeMode,
      perQuestionSeconds: perQuestionSeconds ? Number(perQuestionSeconds) : null,
      totalSeconds: totalSeconds ? Number(totalSeconds) : null,
      questions: questions?.length ? {
        create: (questions as Array<{ prompt: string; optionA: string; optionB: string; optionC: string; optionD: string; correctIndex: number }>)
          .map((q, i) => ({
            prompt: q.prompt, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
            correctIndex: Number(q.correctIndex), orderIndex: i,
          })),
      } : undefined,
    },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  res.status(201).json(created);
});

router.put("/listening/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.listeningStage.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  const { level, stageType, titleArabic, audioUrl, maxPlays, timeMode, perQuestionSeconds, totalSeconds, questions } = req.body;

  if (questions) {
    await prisma.listeningQuestion.deleteMany({ where: { stageId: req.params.id } });
  }

  const updated = await prisma.listeningStage.update({
    where: { id: req.params.id },
    data: {
      ...(level !== undefined && { level }),
      ...(stageType !== undefined && { stageType }),
      ...(titleArabic !== undefined && { titleArabic }),
      ...(audioUrl !== undefined && { audioUrl }),
      ...(maxPlays !== undefined && { maxPlays: Number(maxPlays) }),
      ...(timeMode !== undefined && { timeMode }),
      ...(perQuestionSeconds !== undefined && { perQuestionSeconds: perQuestionSeconds ? Number(perQuestionSeconds) : null }),
      ...(totalSeconds !== undefined && { totalSeconds: totalSeconds ? Number(totalSeconds) : null }),
      ...(questions && {
        questions: {
          create: (questions as Array<{ prompt: string; optionA: string; optionB: string; optionC: string; optionD: string; correctIndex: number }>)
            .map((q, i) => ({
              prompt: q.prompt, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
              correctIndex: Number(q.correctIndex), orderIndex: i,
            })),
        },
      }),
    },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  res.json(updated);
});

router.delete("/listening/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.listeningStage.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  await prisma.listeningStage.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ══════════════════════════════════════════════════
// WRITING TASKS CRUD
// ══════════════════════════════════════════════════

router.get("/writing", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize), 10) || 20));
  const level = req.query.level as string | undefined;
  const skip = (page - 1) * pageSize;
  const where: { level?: string } = {};
  if (level && CEFR_LEVELS.includes(level as typeof CEFR_LEVELS[number])) where.level = level;

  const [items, total] = await Promise.all([
    prisma.writingTask.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
    prisma.writingTask.count({ where }),
  ]);
  res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

router.get("/writing/:id", async (req: AuthRequest, res: Response) => {
  const item = await prisma.writingTask.findUnique({ where: { id: req.params.id } });
  if (!item) { res.status(404).json({ message: "Topilmadi" }); return; }
  res.json(item);
});

router.post("/writing", async (req: AuthRequest, res: Response) => {
  const { level, prompt, wordLimitMin, wordLimitMax, rubric } = req.body;
  if (!level || !prompt || wordLimitMin === undefined || wordLimitMax === undefined || !rubric) {
    res.status(400).json({ message: "Barcha maydonlar to'ldirilishi shart" }); return;
  }
  const created = await prisma.writingTask.create({
    data: {
      level, prompt,
      wordLimitMin: Number(wordLimitMin),
      wordLimitMax: Number(wordLimitMax),
      rubric: typeof rubric === "string" ? rubric : JSON.stringify(rubric),
    },
  });
  res.json(created);
});

router.put("/writing/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.writingTask.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  const { level, prompt, wordLimitMin, wordLimitMax, rubric } = req.body;
  const updated = await prisma.writingTask.update({
    where: { id: req.params.id },
    data: {
      ...(level !== undefined && { level }),
      ...(prompt !== undefined && { prompt }),
      ...(wordLimitMin !== undefined && { wordLimitMin: Number(wordLimitMin) }),
      ...(wordLimitMax !== undefined && { wordLimitMax: Number(wordLimitMax) }),
      ...(rubric !== undefined && { rubric: typeof rubric === "string" ? rubric : JSON.stringify(rubric) }),
    },
  });
  res.json(updated);
});

router.delete("/writing/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.writingTask.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  await prisma.writingTask.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ══════════════════════════════════════════════════
// SPEAKING TASKS CRUD
// ══════════════════════════════════════════════════

router.get("/speaking", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize), 10) || 20));
  const level = req.query.level as string | undefined;
  const skip = (page - 1) * pageSize;
  const where: { level?: string } = {};
  if (level && CEFR_LEVELS.includes(level as typeof CEFR_LEVELS[number])) where.level = level;

  const [items, total] = await Promise.all([
    prisma.speakingTask.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
    prisma.speakingTask.count({ where }),
  ]);
  res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

router.get("/speaking/:id", async (req: AuthRequest, res: Response) => {
  const item = await prisma.speakingTask.findUnique({ where: { id: req.params.id } });
  if (!item) { res.status(404).json({ message: "Topilmadi" }); return; }
  res.json(item);
});

router.post("/speaking", async (req: AuthRequest, res: Response) => {
  const { level, part1Questions, part2Topics, part3Discussion, rubric } = req.body;
  if (!level || !part1Questions || !part2Topics || !part3Discussion || !rubric) {
    res.status(400).json({ message: "Barcha maydonlar to'ldirilishi shart" }); return;
  }
  const created = await prisma.speakingTask.create({
    data: {
      level,
      part1Questions: typeof part1Questions === "string" ? part1Questions : JSON.stringify(part1Questions),
      part2Topics: typeof part2Topics === "string" ? part2Topics : JSON.stringify(part2Topics),
      part3Discussion: typeof part3Discussion === "string" ? part3Discussion : JSON.stringify(part3Discussion),
      rubric: typeof rubric === "string" ? rubric : JSON.stringify(rubric),
    },
  });
  res.json(created);
});

router.put("/speaking/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.speakingTask.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  const { level, part1Questions, part2Topics, part3Discussion, rubric } = req.body;
  const updated = await prisma.speakingTask.update({
    where: { id: req.params.id },
    data: {
      ...(level !== undefined && { level }),
      ...(part1Questions !== undefined && { part1Questions: typeof part1Questions === "string" ? part1Questions : JSON.stringify(part1Questions) }),
      ...(part2Topics !== undefined && { part2Topics: typeof part2Topics === "string" ? part2Topics : JSON.stringify(part2Topics) }),
      ...(part3Discussion !== undefined && { part3Discussion: typeof part3Discussion === "string" ? part3Discussion : JSON.stringify(part3Discussion) }),
      ...(rubric !== undefined && { rubric: typeof rubric === "string" ? rubric : JSON.stringify(rubric) }),
    },
  });
  res.json(updated);
});

router.delete("/speaking/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.speakingTask.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  await prisma.speakingTask.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ══════════════════════════════════════════════════
// LEGACY QUESTION BANK (backward compat)
// ══════════════════════════════════════════════════

const BANK_SECTIONS = ["listening", "reading", "language_use"] as const;

router.get("/question-bank", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(String(req.query.pageSize), 10) || 20));
  const level = req.query.level as string | undefined;
  const section = req.query.section as string | undefined;
  const skip = (page - 1) * pageSize;
  const where: { level?: string; section?: string } = {};
  if (level && CEFR_LEVELS.includes(level as typeof CEFR_LEVELS[number])) where.level = level;
  if (section && BANK_SECTIONS.includes(section as typeof BANK_SECTIONS[number])) where.section = section;

  const [items, total] = await Promise.all([
    prisma.questionBank.findMany({ where, skip, take: pageSize, orderBy: [{ level: "asc" }, { section: "asc" }, { createdAt: "desc" }] }),
    prisma.questionBank.count({ where }),
  ]);
  res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

export const adminRoutes = router;
