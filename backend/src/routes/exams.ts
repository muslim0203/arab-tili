import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { generateMcqQuestions } from "../services/openai-exam.js";
import { isValidCefrLevel, type CefrLevel } from "../services/openai-cefr-exam.js";
import { createCefrAttempt } from "../services/cefr-attempt.js";

const router = Router();

// ──────────────────────────────────────────────────
// GET /api/exams/grammar/mixed  — 10 easy + 10 medium + 10 hard = 30 mixed grammar Qs
// Javob variantlari ham random aralashtiriladi
// ──────────────────────────────────────────────────
router.get("/grammar/mixed", authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const PER_DIFFICULTY = 10;

    // Har bir qiyinlikdan barcha savollarni olamiz
    const [easyAll, mediumAll, hardAll] = await Promise.all([
      prisma.grammarQuestion.findMany({ where: { difficulty: "easy" } }),
      prisma.grammarQuestion.findMany({ where: { difficulty: "medium" } }),
      prisma.grammarQuestion.findMany({ where: { difficulty: "hard" } }),
    ]);

    // Fisher-Yates shuffle
    function shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // Har biridan PER_DIFFICULTY ta random tanlaymiz
    const easy = shuffle(easyAll).slice(0, PER_DIFFICULTY);
    const medium = shuffle(mediumAll).slice(0, PER_DIFFICULTY);
    const hard = shuffle(hardAll).slice(0, PER_DIFFICULTY);

    // Barchasini birlashtirib, yana aralashtirish
    const allQuestions = shuffle([...easy, ...medium, ...hard]);

    // Har bir savolning variantlarini aralashtirish
    const result = allQuestions.map((q) => {
      const options: string[] = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
      const correctOption = options[q.correctIndex];

      // Variantlarni aralashtirish
      const indices = [0, 1, 2, 3];
      const shuffledIndices = shuffle(indices);
      const shuffledOptions = shuffledIndices.map((i) => options[i]);
      const newCorrectIndex = shuffledOptions.indexOf(correctOption);

      return {
        id: q.id,
        prompt: q.prompt,
        options: shuffledOptions,
        correctIndex: newCorrectIndex,
        difficulty: q.difficulty,
      };
    });

    res.json({
      questions: result,
      count: result.length,
      breakdown: {
        easy: easy.length,
        medium: medium.length,
        hard: hard.length,
      },
    });
  } catch (e) {
    console.error("Grammar mixed error:", e);
    res.status(500).json({ message: "Grammatika savollari yuklanmadi" });
  }
});

function toPublicQuestion(q: {
  id: string;
  order: number;
  questionText: string;
  questionType: string;
  options: unknown;
  points: number;
  section?: string;
  taskType?: string;
  transcript?: string | null;
  rubric?: unknown;
  wordLimit?: number | null;
}) {
  return {
    id: q.id,
    order: q.order,
    questionText: q.questionText,
    questionType: q.questionType,
    options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
    points: q.points,
    section: q.section,
    taskType: q.taskType,
    transcript: q.transcript,
    rubric: typeof q.rubric === "string" ? JSON.parse(q.rubric) : q.rubric,
    wordLimit: q.wordLimit,
  };
}

function taskTypeToQuestionType(taskType: string): "MULTIPLE_CHOICE" | "ESSAY" | "AUDIO_RESPONSE" {
  if (taskType === "essay") return "ESSAY";
  if (taskType === "interview") return "AUDIO_RESPONSE";
  return "MULTIPLE_CHOICE";
}

function stringifyCorrectAnswer(v: string | Record<string, unknown> | string[]): string {
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

// GET /api/exams/cefr/levels – CEFR darajalar ro‘yxati
router.get("/cefr/levels", authenticateToken, (_req: AuthRequest, res: Response) => {
  res.json({ levels: ["A1", "A2", "B1", "B2", "C1", "C2"] });
});

// GET /api/exams/listening/stages – At-Taanal imtihoni uchun listening bosqichlari (DB dan)
// Har bir bosqich uchun random 5 ta savol tanlanadi (har bir savolda o'z audio URL i bor)
router.get("/listening/stages", authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const stages = await prisma.listeningStage.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
      },
    });

    // Fisher-Yates shuffle
    function shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const result = stages.map((stage, idx) => {
      // Har bosqichdan 5 ta random savol tanlaymiz
      const shuffled = shuffle(stage.questions).slice(0, 5);
      return {
        stageIndex: idx + 1,
        type: stage.stageType,
        title: stage.titleArabic,
        timeMode: stage.timingMode,
        perQuestionTimeSec: stage.perQuestionSeconds ?? 60,
        totalTimeSec: stage.totalSeconds ?? 420,
        questions: shuffled.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
          correctIndex: q.correctIndex,
          audioUrl: q.audioUrl,
          maxPlays: q.maxPlays,
        })),
        // maxPlays from first question (all questions in a stage share same maxPlays)
        maxPlays: shuffled[0]?.maxPlays ?? 2,
      };
    });

    res.json({ stages: result });
  } catch (e) {
    console.error("Listening stages error:", e);
    res.status(500).json({ message: "Listening bosqichlari yuklanmadi" });
  }
});

// GET /api/exams – ro‘yxat (auth kerak)
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const exams = await prisma.mockExam.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      examType: { select: { id: true, name: true } },
      _count: {
        select: { questions: true },
      },
    },
  });
  const list = exams.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    durationMinutes: e.durationMinutes,
    examType: e.examType,
    useAiGeneration: e.useAiGeneration,
    questionCount: e.useAiGeneration ? (e.numberOfQuestions ?? 10) : e._count.questions,
  }));
  res.json(list);
});

// GET /api/exams/:id – bitta imtihon meta (savolsiz)
router.get("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  const exam = await prisma.mockExam.findUnique({
    where: { id: req.params.id },
    include: { examType: { select: { id: true, name: true } }, _count: { select: { questions: true } } },
  });
  if (!exam) {
    res.status(404).json({ message: "Imtihon topilmadi" });
    return;
  }
  res.json({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    examType: exam.examType,
    useAiGeneration: exam.useAiGeneration,
    questionCount: exam.useAiGeneration ? (exam.numberOfQuestions ?? 10) : exam._count.questions,
  });
});

// POST /api/exams/cefr/start – Question Bank (L/R/LU) + AI (Writing/Speaking only). No correctAnswer in response.
router.post("/cefr/start", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const level = (req.body?.level ?? req.query?.level) as string;
  if (!level || !isValidCefrLevel(level)) {
    res.status(400).json({ message: "level required: A1, A2, B1, B2, C1, C2" });
    return;
  }
  try {
    const { attempt } = await createCefrAttempt(userId, level as CefrLevel);
    const questions = await prisma.attemptQuestion.findMany({
      where: { attemptId: attempt.id },
      orderBy: { order: "asc" },
    });
    const toPublic = (q: (typeof questions)[0]) => ({
      id: q.id,
      order: q.order,
      section: q.section,
      taskType: q.taskType,
      questionText: q.questionText,
      transcript: q.transcript,
      passage: q.passage,
      options: q.options,
      rubric: q.rubric,
      wordLimit: q.wordLimit,
      maxScore: q.maxScore ?? q.points,
    });
    const listening = questions.filter((q) => q.section === "listening").map(toPublic);
    const reading = questions.filter((q) => q.section === "reading").map(toPublic);
    const language_use = questions.filter((q) => q.section === "language_use").map(toPublic);
    const writing = questions.filter((q) => q.section === "writing").map(toPublic);
    const speaking = questions.filter((q) => q.section === "speaking").map(toPublic);
    res.status(201).json({
      attemptId: attempt.id,
      level: attempt.level,
      sections: [
        { section: "listening", questions: listening },
        { section: "reading", questions: reading },
        { section: "language_use", questions: language_use },
        { section: "writing", tasks: writing },
        { section: "speaking", tasks: speaking },
      ],
    });
  } catch (e) {
    res.status(503).json({
      message: e instanceof Error ? e.message : "CEFR attempt creation failed",
    });
  }
});

// POST /api/exams/:id/start – imtihonni boshlash, savollar AI dan yoki DB dan
router.post("/:id/start", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const examId = req.params.id;
  if (examId === "cefr" || examId === "cefr/start") {
    res.status(404).json({ message: "Imtihon topilmadi" });
    return;
  }

  const exam = await prisma.mockExam.findUnique({
    where: { id: examId },
    include: {
      examType: true,
      questions: { include: { question: true }, orderBy: { order: "asc" } },
    },
  });
  if (!exam) {
    res.status(404).json({ message: "Imtihon topilmadi" });
    return;
  }

  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { languagePreference: true } });
  const lang = user?.languagePreference ?? "uz";

  let attempt = await prisma.userExamAttempt.create({
    data: { userId, mockExamId: examId, status: "IN_PROGRESS" },
  });

  if (exam.useAiGeneration) {
    const count = exam.numberOfQuestions ?? 10;
    const estimatedLevel = progress?.currentCefrEstimate ?? undefined;
    let questions: Awaited<ReturnType<typeof generateMcqQuestions>>;
    try {
      questions = await generateMcqQuestions(exam.title, count, lang, estimatedLevel);
    } catch (e) {
      await prisma.userExamAttempt.delete({ where: { id: attempt.id } });
      res.status(503).json({
        message: "AI savollar generatsiya qila olmadi. Keyinroq qayta urinib ko'ring.",
        detail: e instanceof Error ? e.message : "",
      });
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await prisma.attemptQuestion.create({
        data: {
          attemptId: attempt.id,
          order: i + 1,
          questionText: q.questionText,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          points: q.points,
          questionType: "MULTIPLE_CHOICE",
        },
      });
    }
    const attemptQuestions = await prisma.attemptQuestion.findMany({
      where: { attemptId: attempt.id },
      orderBy: { order: "asc" },
    });
    const questionsPublic = attemptQuestions.map((q) => toPublicQuestion(q));
    res.status(201).json({
      attemptId: attempt.id,
      exam: {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
      },
      questions: questionsPublic,
    });
    return;
  }

  if (exam.questions.length === 0) {
    res.status(400).json({ message: "Bu imtihonda savollar yo‘q" });
    return;
  }
  const questionsPublic = exam.questions.map((mq) => toPublicQuestion(mq.question));
  res.status(201).json({
    attemptId: attempt.id,
    exam: { id: exam.id, title: exam.title, durationMinutes: exam.durationMinutes },
    questions: questionsPublic,
  });
});

export const examRoutes = router;
