import { Router, Response } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, requireAdmin, type AuthRequest } from "../middleware/auth.js";

const router = Router();

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

// POST /api/admin/upload-audio – admin audio yuklash (savol banki uchun)
router.post("/upload-audio", audioUpload.single("audio"), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: "audio fayl yuborilmadi" });
    return;
  }
  const audioUrl = `/api/uploads/audio/${req.file.filename}`;
  res.json({ audioUrl });
});

// GET /api/admin/stats
router.get("/stats", async (_req: AuthRequest, res: Response) => {
  const [usersCount, attemptsCount, completedAttempts, paymentsCompleted, totalRevenue] = await Promise.all([
    prisma.user.count(),
    prisma.userExamAttempt.count(),
    prisma.userExamAttempt.count({ where: { status: "COMPLETED" } }),
    prisma.payment.count({ where: { status: "COMPLETED" } }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);
  res.json({
    usersCount,
    attemptsCount,
    completedAttempts,
    paymentsCompleted,
    totalRevenue: totalRevenue._sum.amount ?? 0,
  });
});

// GET /api/admin/users?page=1&pageSize=20
router.get("/users", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(String(req.query.pageSize), 10) || 20));
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        isAdmin: true,
        lastLogin: true,
        createdAt: true,
        _count: { select: { attempts: true, payments: true } },
      },
    }),
    prisma.user.count(),
  ]);

  res.json({
    items: items.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      subscriptionTier: u.subscriptionTier,
      subscriptionExpiresAt: u.subscriptionExpiresAt?.toISOString() ?? null,
      isAdmin: u.isAdmin,
      lastLogin: u.lastLogin?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      attemptsCount: u._count.attempts,
      paymentsCount: u._count.payments,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const BANK_SECTIONS = ["listening", "reading", "language_use"] as const;

// GET /api/admin/question-bank?level=&section=&page=1&pageSize=20
router.get("/question-bank", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(String(req.query.pageSize), 10) || 20));
  const level = req.query.level as string | undefined;
  const section = req.query.section as string | undefined;
  const skip = (page - 1) * pageSize;

  const where: { level?: string; section?: string } = {};
  if (level && CEFR_LEVELS.includes(level as (typeof CEFR_LEVELS)[number])) where.level = level;
  if (section && BANK_SECTIONS.includes(section as (typeof BANK_SECTIONS)[number])) where.section = section;

  const [items, total] = await Promise.all([
    prisma.questionBank.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ level: "asc" }, { section: "asc" }, { createdAt: "desc" }],
    }),
    prisma.questionBank.count({ where }),
  ]);

  res.json({
    items: items.map((q) => ({
      id: q.id,
      level: q.level,
      section: q.section,
      taskType: q.taskType,
      prompt: q.prompt,
      options: q.options,
      correctAnswer: q.correctAnswer,
      transcript: q.transcript,
      passage: q.passage,
      audioUrl: q.audioUrl,
      rubric: q.rubric,
      difficulty: q.difficulty,
      tags: q.tags,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

// GET /api/admin/question-bank/:id
router.get("/question-bank/:id", async (req: AuthRequest, res: Response) => {
  const q = await prisma.questionBank.findUnique({
    where: { id: req.params.id },
  });
  if (!q) {
    res.status(404).json({ message: "Topshiriq topilmadi" });
    return;
  }
  res.json({
    id: q.id,
    level: q.level,
    section: q.section,
    taskType: q.taskType,
    prompt: q.prompt,
    options: q.options,
    correctAnswer: q.correctAnswer,
    transcript: q.transcript,
    passage: q.passage,
    audioUrl: q.audioUrl,
    rubric: q.rubric,
    difficulty: q.difficulty,
    tags: q.tags,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  });
});

// POST /api/admin/question-bank
router.post("/question-bank", async (req: AuthRequest, res: Response) => {
  const body = req.body as {
    level: string;
    section: string;
    taskType?: string;
    prompt: string;
    options?: unknown;
    correctAnswer: unknown;
    transcript?: string | null;
    passage?: string | null;
    audioUrl?: string | null;
    rubric?: unknown;
    difficulty?: number;
    tags?: unknown;
  };
  if (!body.level || !body.section || !body.prompt || body.correctAnswer === undefined) {
    res.status(400).json({ message: "level, section, prompt va correctAnswer to'ldirilishi shart" });
    return;
  }
  if (!CEFR_LEVELS.includes(body.level as (typeof CEFR_LEVELS)[number])) {
    res.status(400).json({ message: "level: A1, A2, B1, B2, C1, C2 bo'lishi kerak" });
    return;
  }
  if (!BANK_SECTIONS.includes(body.section as (typeof BANK_SECTIONS)[number])) {
    res.status(400).json({ message: "section: listening, reading, language_use bo'lishi kerak" });
    return;
  }

  const created = await prisma.questionBank.create({
    data: {
      level: body.level,
      section: body.section,
      taskType: body.taskType ?? "mcq",
      prompt: body.prompt,
      options: body.options ? (typeof body.options === "string" ? body.options : JSON.stringify(body.options)) : null,
      correctAnswer: typeof body.correctAnswer === "string" ? body.correctAnswer : JSON.stringify(body.correctAnswer),
      transcript: body.transcript ?? null,
      passage: body.passage ?? null,
      audioUrl: body.audioUrl ?? null,
      rubric: body.rubric ? (typeof body.rubric === "string" ? body.rubric : JSON.stringify(body.rubric)) : null,
      difficulty: body.difficulty ?? 3,
      tags: body.tags ? (typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags)) : null,
    },
  });
  res.status(201).json({
    id: created.id,
    level: created.level,
    section: created.section,
    taskType: created.taskType,
    prompt: created.prompt,
    options: created.options,
    correctAnswer: created.correctAnswer,
    transcript: created.transcript,
    passage: created.passage,
    audioUrl: created.audioUrl,
    rubric: created.rubric,
    difficulty: created.difficulty,
    tags: created.tags,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  });
});

// PUT /api/admin/question-bank/:id
router.put("/question-bank/:id", async (req: AuthRequest, res: Response) => {
  const body = req.body as {
    level?: string;
    section?: string;
    taskType?: string;
    prompt?: string;
    options?: unknown;
    correctAnswer?: unknown;
    transcript?: string | null;
    passage?: string | null;
    audioUrl?: string | null;
    rubric?: unknown;
    difficulty?: number;
    tags?: unknown;
  };
  const existing = await prisma.questionBank.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) {
    res.status(404).json({ message: "Topshiriq topilmadi" });
    return;
  }
  if (body.level != null && !CEFR_LEVELS.includes(body.level as (typeof CEFR_LEVELS)[number])) {
    res.status(400).json({ message: "level: A1, A2, B1, B2, C1, C2 bo'lishi kerak" });
    return;
  }
  if (body.section != null && !BANK_SECTIONS.includes(body.section as (typeof BANK_SECTIONS)[number])) {
    res.status(400).json({ message: "section: listening, reading, language_use bo'lishi kerak" });
    return;
  }

  const updated = await prisma.questionBank.update({
    where: { id: req.params.id },
    data: {
      ...(body.level != null && { level: body.level }),
      ...(body.section != null && { section: body.section }),
      ...(body.taskType != null && { taskType: body.taskType }),
      ...(body.prompt != null && { prompt: body.prompt }),
      ...(body.options !== undefined && { options: body.options ? (typeof body.options === "string" ? body.options : JSON.stringify(body.options)) : null }),
      ...(body.correctAnswer !== undefined && { correctAnswer: typeof body.correctAnswer === "string" ? body.correctAnswer : JSON.stringify(body.correctAnswer) }),
      ...(body.transcript !== undefined && { transcript: body.transcript }),
      ...(body.passage !== undefined && { passage: body.passage }),
      ...(body.audioUrl !== undefined && { audioUrl: body.audioUrl }),
      ...(body.rubric !== undefined && { rubric: body.rubric ? (typeof body.rubric === "string" ? body.rubric : JSON.stringify(body.rubric)) : null }),
      ...(body.difficulty !== undefined && { difficulty: body.difficulty }),
      ...(body.tags !== undefined && { tags: body.tags ? (typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags)) : null }),
    },
  });
  res.json({
    id: updated.id,
    level: updated.level,
    section: updated.section,
    taskType: updated.taskType,
    prompt: updated.prompt,
    options: updated.options,
    correctAnswer: updated.correctAnswer,
    transcript: updated.transcript,
    passage: updated.passage,
    audioUrl: updated.audioUrl,
    rubric: updated.rubric,
    difficulty: updated.difficulty,
    tags: updated.tags,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// DELETE /api/admin/question-bank/:id
router.delete("/question-bank/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.questionBank.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) {
    res.status(404).json({ message: "Topshiriq topilmadi" });
    return;
  }
  await prisma.questionBank.delete({
    where: { id: req.params.id },
  });
  res.status(204).send();
});

// GET /api/admin/payments?page=1&pageSize=20
router.get("/payments", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(String(req.query.pageSize), 10) || 20));
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
    }),
    prisma.payment.count(),
  ]);

  res.json({
    items: items.map((p) => ({
      id: p.id,
      userId: p.userId,
      userEmail: p.user.email,
      userFullName: p.user.fullName,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      planId: p.planId,
      paymentProviderId: p.paymentProviderId,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

export const adminRoutes = router;
