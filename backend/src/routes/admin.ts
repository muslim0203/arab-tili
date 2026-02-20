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

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

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
    listeningQuestionCount,
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
    prisma.listeningQuestion.count(),
    prisma.writingTask.count(),
    prisma.speakingTask.count(),
  ]);

  // Count by difficulty
  const [grammarByDiff, readingByDiff, listeningByDiff, speakingByDiff, writingByDiff] = await Promise.all([
    prisma.grammarQuestion.groupBy({ by: ["difficulty"], _count: true }),
    prisma.readingPassage.groupBy({ by: ["difficulty"], _count: true }),
    prisma.listeningQuestion.groupBy({ by: ["difficulty"], _count: true }),
    prisma.speakingTask.groupBy({ by: ["difficulty"], _count: true }),
    prisma.writingTask.groupBy({ by: ["difficulty"], _count: true }),
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
      listeningQuestions: listeningQuestionCount,
      writingTasks: writingTaskCount,
      speakingTasks: speakingTaskCount,
    },
    byDifficulty: {
      grammar: Object.fromEntries(grammarByDiff.map((g) => [g.difficulty, g._count])),
      reading: Object.fromEntries(readingByDiff.map((g) => [g.difficulty, g._count])),
      listening: Object.fromEntries(listeningByDiff.map((g) => [g.difficulty, g._count])),
      speaking: Object.fromEntries(speakingByDiff.map((g) => [g.difficulty, g._count])),
      writing: Object.fromEntries(writingByDiff.map((g) => [g.difficulty, g._count])),
    },
  });
});

// ══════════════════════════════════════════════════
// USERS
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
// PAYMENTS
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
// GRAMMAR QUESTIONS CRUD  (difficulty-based)
// ══════════════════════════════════════════════════

router.get("/grammar", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize), 10) || 20));
  const difficulty = req.query.difficulty as string | undefined;
  const skip = (page - 1) * pageSize;
  const where: { difficulty?: string } = {};
  if (difficulty && DIFFICULTIES.includes(difficulty as typeof DIFFICULTIES[number])) where.difficulty = difficulty;

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
  const { difficulty, prompt, options, correctIndex } = req.body;
  if (!difficulty || !prompt || !options || correctIndex === undefined) {
    res.status(400).json({ message: "difficulty, prompt, options, correctIndex to'ldirilishi shart" }); return;
  }
  if (!DIFFICULTIES.includes(difficulty)) {
    res.status(400).json({ message: "difficulty faqat easy, medium yoki hard bo'lishi mumkin" }); return;
  }
  const optionsStr = typeof options === "string" ? options : JSON.stringify(options);
  const parsed = JSON.parse(optionsStr);
  if (!Array.isArray(parsed) || parsed.length !== 4) {
    res.status(400).json({ message: "options 4 ta element bo'lishi shart" }); return;
  }
  const created = await prisma.grammarQuestion.create({
    data: { difficulty, prompt, options: optionsStr, correctIndex: Number(correctIndex) },
  });
  res.status(201).json(created);
});

router.put("/grammar/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.grammarQuestion.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  const { difficulty, prompt, options, correctIndex } = req.body;

  const data: Record<string, unknown> = {};
  if (difficulty !== undefined) {
    if (!DIFFICULTIES.includes(difficulty)) { res.status(400).json({ message: "Noto'g'ri difficulty" }); return; }
    data.difficulty = difficulty;
  }
  if (prompt !== undefined) data.prompt = prompt;
  if (options !== undefined) data.options = typeof options === "string" ? options : JSON.stringify(options);
  if (correctIndex !== undefined) data.correctIndex = Number(correctIndex);

  const updated = await prisma.grammarQuestion.update({ where: { id: req.params.id }, data });
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

const PASSAGE_DEFAULTS: Record<string, { readingTime: number; questionTime: number; questionCount: number }> = {
  short: { readingTime: 120, questionTime: 360, questionCount: 6 },
  medium: { readingTime: 180, questionTime: 480, questionCount: 8 },
  long: { readingTime: 300, questionTime: 1200, questionCount: 10 },
};

router.get("/reading", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize), 10) || 20));
  const difficulty = req.query.difficulty as string | undefined;
  const passageType = req.query.passageType as string | undefined;
  const skip = (page - 1) * pageSize;
  const where: { difficulty?: string; passageType?: string } = {};
  if (difficulty && DIFFICULTIES.includes(difficulty as typeof DIFFICULTIES[number])) where.difficulty = difficulty;
  if (passageType && ["short", "medium", "long"].includes(passageType)) where.passageType = passageType;

  const [items, total] = await Promise.all([
    prisma.readingPassage.findMany({
      where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    }),
    prisma.readingPassage.count({ where }),
  ]);
  res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

router.get("/reading/defaults", (_req: AuthRequest, res: Response) => {
  res.json(PASSAGE_DEFAULTS);
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
  const { difficulty, passageType, text, readingTimeSeconds, questionTimeSeconds, questions } = req.body;
  if (!difficulty || !passageType || !text) {
    res.status(400).json({ message: "difficulty, passageType, text to'ldirilishi shart" }); return;
  }
  if (!DIFFICULTIES.includes(difficulty)) {
    res.status(400).json({ message: "Noto'g'ri difficulty" }); return;
  }
  const defaults = PASSAGE_DEFAULTS[passageType];
  const created = await prisma.readingPassage.create({
    data: {
      difficulty, passageType, text,
      readingTimeSeconds: Number(readingTimeSeconds ?? defaults?.readingTime ?? 120),
      questionTimeSeconds: Number(questionTimeSeconds ?? defaults?.questionTime ?? 360),
      questions: questions?.length ? {
        create: (questions as Array<{ prompt: string; options: string | string[]; correctIndex: number }>)
          .map((q, i) => ({
            prompt: q.prompt,
            options: typeof q.options === "string" ? q.options : JSON.stringify(q.options),
            correctIndex: Number(q.correctIndex),
            orderIndex: i,
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
  const { difficulty, passageType, text, readingTimeSeconds, questionTimeSeconds, questions } = req.body;

  if (questions) {
    await prisma.readingQuestion.deleteMany({ where: { passageId: req.params.id } });
  }

  const updated = await prisma.readingPassage.update({
    where: { id: req.params.id },
    data: {
      ...(difficulty !== undefined && { difficulty }),
      ...(passageType !== undefined && { passageType }),
      ...(text !== undefined && { text }),
      ...(readingTimeSeconds !== undefined && { readingTimeSeconds: Number(readingTimeSeconds) }),
      ...(questionTimeSeconds !== undefined && { questionTimeSeconds: Number(questionTimeSeconds) }),
      ...(questions && {
        questions: {
          create: (questions as Array<{ prompt: string; options: string | string[]; correctIndex: number }>)
            .map((q, i) => ({
              prompt: q.prompt,
              options: typeof q.options === "string" ? q.options : JSON.stringify(q.options),
              correctIndex: Number(q.correctIndex),
              orderIndex: i,
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
// LISTENING STAGES + QUESTIONS CRUD
// ══════════════════════════════════════════════════

// GET all stages (fixed 3)
router.get("/listening/stages", async (_req: AuthRequest, res: Response) => {
  const stages = await prisma.listeningStage.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      questions: { orderBy: { orderIndex: "asc" } },
      _count: { select: { questions: true } },
    },
  });
  res.json(stages.map((s) => ({
    ...s,
    questionCount: s._count.questions,
    isComplete: s._count.questions === 5,
  })));
});

// GET single stage with questions
router.get("/listening/stages/:id", async (req: AuthRequest, res: Response) => {
  const stage = await prisma.listeningStage.findUnique({
    where: { id: req.params.id },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!stage) { res.status(404).json({ message: "Stage topilmadi" }); return; }
  res.json(stage);
});

// UPDATE stage timing settings
router.put("/listening/stages/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.listeningStage.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Stage topilmadi" }); return; }
  const { titleArabic, timingMode, perQuestionSeconds, totalSeconds } = req.body;

  const updated = await prisma.listeningStage.update({
    where: { id: req.params.id },
    data: {
      ...(titleArabic !== undefined && { titleArabic }),
      ...(timingMode !== undefined && { timingMode }),
      ...(perQuestionSeconds !== undefined && { perQuestionSeconds: perQuestionSeconds ? Number(perQuestionSeconds) : null }),
      ...(totalSeconds !== undefined && { totalSeconds: totalSeconds ? Number(totalSeconds) : null }),
    },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  res.json(updated);
});

// ── Listening Questions CRUD ──

// Add question to a stage
router.post("/listening/questions", async (req: AuthRequest, res: Response) => {
  const { stageId, difficulty, prompt, options, correctIndex, audioUrl, maxPlays } = req.body;
  if (!stageId || !difficulty || !prompt || !options || correctIndex === undefined || !audioUrl) {
    res.status(400).json({ message: "stageId, difficulty, prompt, options, correctIndex, audioUrl to'ldirilishi shart" }); return;
  }

  // Validate stage exists
  const stage = await prisma.listeningStage.findUnique({
    where: { id: stageId },
    include: { _count: { select: { questions: true } } },
  });
  if (!stage) { res.status(404).json({ message: "Stage topilmadi" }); return; }
  if (stage._count.questions >= 5) {
    res.status(400).json({ message: "Bu stage da 5 ta savol mavjud. Yangi savol qo'shib bo'lmaydi." }); return;
  }

  if (!DIFFICULTIES.includes(difficulty)) {
    res.status(400).json({ message: "Noto'g'ri difficulty" }); return;
  }

  const optionsStr = typeof options === "string" ? options : JSON.stringify(options);
  const created = await prisma.listeningQuestion.create({
    data: {
      stageId, difficulty, prompt, options: optionsStr,
      correctIndex: Number(correctIndex),
      audioUrl,
      maxPlays: Number(maxPlays ?? 2),
      orderIndex: stage._count.questions,
    },
  });
  res.status(201).json(created);
});

// Update a listening question
router.put("/listening/questions/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.listeningQuestion.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Savol topilmadi" }); return; }
  const { difficulty, prompt, options, correctIndex, audioUrl, maxPlays, orderIndex } = req.body;

  const data: Record<string, unknown> = {};
  if (difficulty !== undefined) {
    if (!DIFFICULTIES.includes(difficulty)) { res.status(400).json({ message: "Noto'g'ri difficulty" }); return; }
    data.difficulty = difficulty;
  }
  if (prompt !== undefined) data.prompt = prompt;
  if (options !== undefined) data.options = typeof options === "string" ? options : JSON.stringify(options);
  if (correctIndex !== undefined) data.correctIndex = Number(correctIndex);
  if (audioUrl !== undefined) data.audioUrl = audioUrl;
  if (maxPlays !== undefined) data.maxPlays = Number(maxPlays);
  if (orderIndex !== undefined) data.orderIndex = Number(orderIndex);

  const updated = await prisma.listeningQuestion.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

// Delete a listening question
router.delete("/listening/questions/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.listeningQuestion.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Savol topilmadi" }); return; }

  // Delete audio file if exists
  if (existing.audioUrl) {
    const filename = existing.audioUrl.split("/").pop();
    if (filename) {
      const filePath = path.join(audioUploadDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  await prisma.listeningQuestion.delete({ where: { id: req.params.id } });

  // Reorder remaining questions
  const remaining = await prisma.listeningQuestion.findMany({
    where: { stageId: existing.stageId },
    orderBy: { orderIndex: "asc" },
  });
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].orderIndex !== i) {
      await prisma.listeningQuestion.update({
        where: { id: remaining[i].id },
        data: { orderIndex: i },
      });
    }
  }

  res.status(204).send();
});

// ══════════════════════════════════════════════════
// WRITING TOPICS CRUD (difficulty + prompt)
// ══════════════════════════════════════════════════

router.get("/writing", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize), 10) || 20));
  const difficulty = req.query.difficulty as string | undefined;
  const skip = (page - 1) * pageSize;
  const where: { difficulty?: string } = {};
  if (difficulty && DIFFICULTIES.includes(difficulty as typeof DIFFICULTIES[number])) where.difficulty = difficulty;

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
  const { difficulty, prompt } = req.body;
  if (!difficulty || !prompt) {
    res.status(400).json({ message: "difficulty va prompt to'ldirilishi shart" }); return;
  }
  if (!DIFFICULTIES.includes(difficulty)) {
    res.status(400).json({ message: "difficulty faqat easy, medium yoki hard bo'lishi mumkin" }); return;
  }
  const created = await prisma.writingTask.create({
    data: { difficulty, prompt },
  });
  res.status(201).json(created);
});

router.put("/writing/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.writingTask.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  const { difficulty, prompt } = req.body;

  const data: Record<string, unknown> = {};
  if (difficulty !== undefined) {
    if (!DIFFICULTIES.includes(difficulty)) { res.status(400).json({ message: "Noto'g'ri difficulty" }); return; }
    data.difficulty = difficulty;
  }
  if (prompt !== undefined) data.prompt = prompt;

  const updated = await prisma.writingTask.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

router.delete("/writing/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.writingTask.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  await prisma.writingTask.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ══════════════════════════════════════════════════
// SPEAKING TOPICS CRUD (difficulty + prompt)
// ══════════════════════════════════════════════════

router.get("/speaking", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize), 10) || 20));
  const difficulty = req.query.difficulty as string | undefined;
  const skip = (page - 1) * pageSize;
  const where: { difficulty?: string } = {};
  if (difficulty && DIFFICULTIES.includes(difficulty as typeof DIFFICULTIES[number])) where.difficulty = difficulty;

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
  const { difficulty, prompt } = req.body;
  if (!difficulty || !prompt) {
    res.status(400).json({ message: "difficulty va prompt to'ldirilishi shart" }); return;
  }
  if (!DIFFICULTIES.includes(difficulty)) {
    res.status(400).json({ message: "difficulty faqat easy, medium yoki hard bo'lishi mumkin" }); return;
  }
  const created = await prisma.speakingTask.create({
    data: { difficulty, prompt },
  });
  res.status(201).json(created);
});

router.put("/speaking/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.speakingTask.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: "Topilmadi" }); return; }
  const { difficulty, prompt } = req.body;

  const data: Record<string, unknown> = {};
  if (difficulty !== undefined) {
    if (!DIFFICULTIES.includes(difficulty)) { res.status(400).json({ message: "Noto'g'ri difficulty" }); return; }
    data.difficulty = difficulty;
  }
  if (prompt !== undefined) data.prompt = prompt;

  const updated = await prisma.speakingTask.update({ where: { id: req.params.id }, data });
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

router.get("/question-bank", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(String(req.query.pageSize), 10) || 20));
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.questionBank.findMany({ skip, take: pageSize, orderBy: { createdAt: "desc" } }),
    prisma.questionBank.count(),
  ]);
  res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

export const adminRoutes = router;
