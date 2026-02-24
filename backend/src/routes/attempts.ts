import { Router, Response } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { evaluateCefrLevel } from "../services/openai-exam.js";
import { isAnswerCorrect } from "../services/cefr-attempt.js";
import { gradeWriting, gradeSpeaking } from "../services/ai-writing-speaking.js";
import { transcribeAudio } from "../services/transcribe.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_AUDIO_MIMES = new Set([
  "audio/webm", "audio/mpeg", "audio/mp3", "audio/mp4",
  "audio/m4a", "audio/wav", "audio/x-wav", "audio/ogg",
]);
const ALLOWED_AUDIO_EXTS = /\.(webm|mp3|m4a|wav|mpga|mpeg|mp4|ogg)$/i;

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB
  fileFilter: (_req, file, cb) => {
    const extOk = ALLOWED_AUDIO_EXTS.test(file.originalname);
    const mimeOk = ALLOWED_AUDIO_MIMES.has(file.mimetype) || file.mimetype?.startsWith("audio/");
    if (extOk || mimeOk) {
      cb(null, true);
    } else {
      cb(new Error(`Ruxsat etilmagan fayl turi: ${file.mimetype}. Faqat audio fayllar qabul qilinadi.`));
    }
  },
});

const router = Router();

// GET /api/attempts – foydalanuvchining imtihon urinishlari ro'yxati (tarix)
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const limit = Math.min(parseInt(String(req.query.limit), 10) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const attempts = await prisma.userExamAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      status: true,
      level: true,
      totalScore: true,
      maxPossibleScore: true,
      percentage: true,
      cefrLevelAchieved: true,
      sectionScores: true,
      startedAt: true,
      completedAt: true,
      mockExam: { select: { id: true, title: true, durationMinutes: true } },
      _count: { select: { attemptQuestions: true } },
      answers: { select: { isCorrect: true, answerText: true } },
    },
  });

  const hasMore = attempts.length > limit;
  const items = hasMore ? attempts.slice(0, limit) : attempts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  res.json({
    items: items.map((a) => {
      // Parse sectionScores from JSON string
      let sectionScores: Record<string, { score: number; max: number }> | null = null;
      if (a.sectionScores) {
        try {
          sectionScores = typeof a.sectionScores === "string"
            ? JSON.parse(a.sectionScores)
            : (a.sectionScores as Record<string, { score: number; max: number }>);
        } catch { sectionScores = null; }
      }

      // Count correct / wrong / unanswered
      const questionsCount = a._count.attemptQuestions;
      let correctCount = 0;
      let wrongCount = 0;
      let unansweredCount = 0;
      for (const ans of a.answers) {
        if (ans.answerText == null || ans.answerText.trim() === "") {
          unansweredCount++;
        } else if (ans.isCorrect === true) {
          correctCount++;
        } else if (ans.isCorrect === false) {
          wrongCount++;
        }
        // writing/speaking don't have isCorrect, they're scored separately
      }
      unansweredCount = Math.max(0, questionsCount - a.answers.length) + unansweredCount;

      // Duration in minutes
      let durationMinutes: number | null = null;
      if (a.completedAt && a.startedAt) {
        durationMinutes = Math.round(
          (new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime()) / 60000
        );
      }

      return {
        id: a.id,
        status: a.status,
        level: a.level,
        totalScore: a.totalScore,
        maxPossibleScore: a.maxPossibleScore,
        percentage: a.percentage,
        cefrLevelAchieved: a.cefrLevelAchieved,
        sectionScores,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        examTitle: a.mockExam?.title ?? (a.level ? `CEFR ${a.level}` : null),
        examDurationMinutes: a.mockExam?.durationMinutes ?? null,
        actualDurationMinutes: durationMinutes,
        questionsCount,
        correctCount,
        wrongCount,
        unansweredCount,
      };
    }),
    nextCursor,
  });
});

const answerSchema = z.object({
  questionId: z.string().optional(),
  attemptQuestionId: z.string().optional(),
  answerText: z.string(),
}).refine((d) => d.questionId ?? d.attemptQuestionId, { message: "questionId yoki attemptQuestionId kerak" });

const submitBodySchema = z.object({
  answers: z.array(z.object({
    attemptQuestionId: z.string(),
    answer: z.string(),
  })).optional(),
  writing: z.array(z.object({
    taskId: z.string(),
    text: z.string(),
  })).optional(),
  speaking: z.array(z.object({
    taskId: z.string(),
    text: z.string().optional(),
    audioUrl: z.string().optional(),
  })).optional(),
});

// GET /api/attempts/:id – attempt + savollar (correctAnswer siz) + mavjud javoblar
router.get("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  const attemptId = req.params.id;
  const userId = req.userId!;

  const attempt = await prisma.userExamAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      mockExam: { select: { id: true, title: true, durationMinutes: true } },
      attemptQuestions: { orderBy: { order: "asc" } },
      answers: true,
    },
  });
  if (!attempt) {
    res.status(404).json({ message: "Attempt topilmadi" });
    return;
  }

  const questions = attempt.attemptQuestions.length > 0
    ? attempt.attemptQuestions.map((q) => ({
      id: q.id,
      order: q.order,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options ? JSON.parse(q.options) : null,
      points: q.points,
      maxScore: q.maxScore ?? q.points,
      section: q.section,
      taskType: q.taskType,
      transcript: q.transcript,
      passage: q.passage,
      audioUrl: q.audioUrl,
      rubric: q.rubric ? JSON.parse(q.rubric) : null,
      wordLimit: q.wordLimit,
    }))
    : await getQuestionsFromPredefined(attemptId);

  const answersMap: Record<string, { answerText: string | null; audioUrl?: string | null }> = {};
  for (const a of attempt.answers) {
    const key = a.attemptQuestionId ?? a.questionId ?? "";
    answersMap[key] = { answerText: a.answerText, audioUrl: a.audioUrl ?? undefined };
  }

  const useAttemptQuestionId = attempt.attemptQuestions.length > 0;
  res.json({
    attemptId: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    level: attempt.level,
    exam: attempt.mockExam ?? (attempt.level ? { id: "cefr", title: `CEFR ${attempt.level}`, durationMinutes: 120 } : null),
    questions,
    answers: answersMap,
    useAttemptQuestionId,
  });
});

async function getQuestionsFromPredefined(attemptId: string) {
  const attempt = await prisma.userExamAttempt.findUnique({
    where: { id: attemptId },
    include: { mockExam: { include: { questions: { include: { question: true }, orderBy: { order: "asc" } } } } },
  });
  if (!attempt?.mockExam?.questions?.length) return [];
  return attempt.mockExam.questions.map((mq) => ({
    id: mq.question.id,
    order: mq.order,
    questionText: mq.question.questionText,
    questionType: mq.question.questionType,
    options: mq.question.options,
    points: mq.question.points,
  }));
}

// PUT /api/attempts/:id/answer – javob yozish
router.put("/:id/answer", authenticateToken, async (req: AuthRequest, res: Response) => {
  const attemptId = req.params.id;
  const userId = req.userId!;
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "questionId yoki attemptQuestionId va answerText kerak" });
    return;
  }
  const { questionId, attemptQuestionId, answerText } = parsed.data;

  const attempt = await prisma.userExamAttempt.findFirst({
    where: { id: attemptId, userId },
  });
  if (!attempt) {
    res.status(404).json({ message: "Attempt topilmadi" });
    return;
  }
  if (attempt.status !== "IN_PROGRESS") {
    res.status(400).json({ message: "Imtihon tugagan" });
    return;
  }

  const payload: { attemptId: string; answerText: string; attemptQuestionId?: string; questionId?: string } = {
    attemptId,
    answerText,
  };
  if (attemptQuestionId) payload.attemptQuestionId = attemptQuestionId;
  if (questionId) payload.questionId = questionId;

  await prisma.userAnswer.upsert({
    where: attemptQuestionId
      ? { attemptId_attemptQuestionId: { attemptId, attemptQuestionId } }
      : { attemptId_questionId: { attemptId, questionId: questionId! } },
    create: payload,
    update: { answerText },
  });
  res.json({ ok: true });
});

// POST /api/attempts/:id/speaking-audio – multipart: audio (file), attemptQuestionId. Saves file, returns audioUrl.
router.post("/:id/speaking-audio", authenticateToken, upload.single("audio"), async (req: AuthRequest, res: Response) => {
  const attemptId = req.params.id;
  const userId = req.userId!;
  const attemptQuestionId = z.string().min(1).safeParse(req.body?.attemptQuestionId);
  if (!attemptQuestionId.success || !req.file) {
    res.status(400).json({ message: "audio fayl va attemptQuestionId kerak" });
    return;
  }
  const qId = attemptQuestionId.data;
  const attempt = await prisma.userExamAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { attemptQuestions: { where: { id: qId, section: "speaking" } } },
  });
  if (!attempt || attempt.status !== "IN_PROGRESS" || attempt.attemptQuestions.length === 0) {
    fs.unlink(req.file.path, () => { });
    res.status(404).json({ message: "Attempt yoki speaking savoli topilmadi" });
    return;
  }
  const ext = path.extname(req.file.originalname) || ".webm";
  const finalName = `${attemptId}_${qId}${ext}`;
  const finalPath = path.join(UPLOADS_DIR, finalName);
  try {
    fs.renameSync(req.file.path, finalPath);
  } catch {
    fs.unlink(req.file.path, () => { });
    res.status(500).json({ message: "Fayl saqlanmadi" });
    return;
  }
  const audioUrl = `/api/uploads/${finalName}`;
  await prisma.userAnswer.upsert({
    where: { attemptId_attemptQuestionId: { attemptId, attemptQuestionId: qId } },
    create: { attemptId, attemptQuestionId: qId, answerText: "[Audio yuklandi]", audioUrl },
    update: { answerText: "[Audio yuklandi]", audioUrl },
  });
  res.json({ audioUrl });
});

// POST /api/attempts/:id/submit – body: answers[], writing[], speaking[]. Server-side grading; AI for writing/speaking.
router.post("/:id/submit", authenticateToken, async (req: AuthRequest, res: Response) => {
  const attemptId = req.params.id;
  const userId = req.userId!;
  const bodyResult = submitBodySchema.safeParse(req.body ?? {});

  const attempt = await prisma.userExamAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      attemptQuestions: true,
      answers: true,
      mockExam: { include: { questions: { include: { question: true } } } },
    },
  });
  if (!attempt) {
    res.status(404).json({ message: "Attempt not found" });
    return;
  }
  if (attempt.status === "COMPLETED") {
    res.json({ message: "Already submitted", attemptId });
    return;
  }

  if (bodyResult.success && bodyResult.data) {
    const { answers = [], writing = [], speaking = [] } = bodyResult.data;
    for (const a of answers) {
      await prisma.userAnswer.upsert({
        where: { attemptId_attemptQuestionId: { attemptId, attemptQuestionId: a.attemptQuestionId } },
        create: { attemptId, attemptQuestionId: a.attemptQuestionId, answerText: a.answer },
        update: { answerText: a.answer },
      });
    }
    for (const w of writing) {
      await prisma.userAnswer.upsert({
        where: { attemptId_attemptQuestionId: { attemptId, attemptQuestionId: w.taskId } },
        create: { attemptId, attemptQuestionId: w.taskId, answerText: w.text },
        update: { answerText: w.text },
      });
    }
    for (const s of speaking) {
      const text = s.text != null && s.text !== "" ? s.text : (s.audioUrl ? "[Audio yuklandi]" : "");
      await prisma.userAnswer.upsert({
        where: { attemptId_attemptQuestionId: { attemptId, attemptQuestionId: s.taskId } },
        create: { attemptId, attemptQuestionId: s.taskId, answerText: text, audioUrl: s.audioUrl ?? null },
        update: { answerText: text, audioUrl: s.audioUrl ?? undefined },
      });
    }
  }

  const attemptRefreshed = await prisma.userExamAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { attemptQuestions: true, answers: true, mockExam: { include: { questions: { include: { question: true } } } } },
  });
  const attemptForGrading = attemptRefreshed ?? attempt;

  const isAiAttempt = attemptForGrading.attemptQuestions.length > 0;
  let totalScore = 0;
  let maxPossible = 0;
  const sectionScores: Record<string, { score: number; max: number }> = {};

  const level = (attemptForGrading.level ?? "B1") as "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

  if (isAiAttempt) {
    const answersByQ = new Map(attemptForGrading.answers.map((a) => [a.attemptQuestionId ?? "", a]));
    for (const q of attemptForGrading.attemptQuestions) {
      const ans = answersByQ.get(q.id);
      const userText = ans?.answerText ?? null;
      const maxPts = q.maxScore ?? q.points;
      maxPossible += maxPts;

      if (q.section === "writing") {
        const rubric = q.rubric ? (JSON.parse(q.rubric) as Record<string, unknown>) : {};
        const result = await gradeWriting(level, { prompt: q.questionText, rubric, maxScore: maxPts }, userText ?? "");
        totalScore += result.score;
        sectionScores[q.section] = (sectionScores[q.section] ?? { score: 0, max: 0 });
        sectionScores[q.section].score += result.score;
        sectionScores[q.section].max += maxPts;
        await prisma.userAnswer.upsert({
          where: { attemptId_attemptQuestionId: { attemptId, attemptQuestionId: q.id } },
          create: { attemptId, attemptQuestionId: q.id, answerText: userText, pointsEarned: Math.round(result.score), score: result.score, aiFeedback: result.feedback },
          update: { pointsEarned: Math.round(result.score), score: result.score, aiFeedback: result.feedback },
        });
        continue;
      }
      if (q.section === "speaking") {
        let transcript = userText ?? "";
        if (ans?.audioUrl && (!transcript || transcript === "[Audio yuklandi]")) {
          const basename = path.basename(ans.audioUrl);
          const localPath = path.join(UPLOADS_DIR, basename);
          const transcribed = await transcribeAudio(localPath);
          if (transcribed) transcript = transcribed;
        }
        const rubric = q.rubric ? (JSON.parse(q.rubric) as Record<string, unknown>) : {};
        const result = await gradeSpeaking(level, { prompt: q.questionText, rubric, maxScore: maxPts }, transcript);
        totalScore += result.score;
        sectionScores[q.section] = (sectionScores[q.section] ?? { score: 0, max: 0 });
        sectionScores[q.section].score += result.score;
        sectionScores[q.section].max += maxPts;
        await prisma.userAnswer.upsert({
          where: { attemptId_attemptQuestionId: { attemptId, attemptQuestionId: q.id } },
          create: { attemptId, attemptQuestionId: q.id, answerText: transcript, audioUrl: ans?.audioUrl ?? null, pointsEarned: Math.round(result.score), score: result.score, aiFeedback: result.feedback },
          update: { answerText: transcript, pointsEarned: Math.round(result.score), score: result.score, aiFeedback: result.feedback },
        });
        continue;
      }

      const correct = ans && isAnswerCorrect(userText ?? "", q.correctAnswer);
      const points = correct ? (q.points || 1) : 0;
      totalScore += points;
      sectionScores[q.section] = (sectionScores[q.section] ?? { score: 0, max: 0 });
      sectionScores[q.section].score += points;
      sectionScores[q.section].max += maxPts;
      await prisma.userAnswer.upsert({
        where: { attemptId_attemptQuestionId: { attemptId, attemptQuestionId: q.id } },
        create: {
          attemptId,
          attemptQuestionId: q.id,
          answerText: userText,
          isCorrect: correct,
          pointsEarned: points,
        },
        update: { isCorrect: correct, pointsEarned: points },
      });
    }
  } else if (attemptForGrading.mockExam?.questions) {
    for (const mq of attemptForGrading.mockExam.questions) {
      const q = mq.question;
      maxPossible += q.points;
      const ans = attemptForGrading.answers.find((a) => a.questionId === q.id);
      const correct = ans && isAnswerCorrect(ans.answerText ?? "", q.correctAnswer);
      const points = correct ? q.points : 0;
      totalScore += points;
      sectionScores.section = (sectionScores.section ?? { score: 0, max: 0 });
      sectionScores.section.score += points;
      sectionScores.section.max += q.points;
      await prisma.userAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: q.id } },
        create: {
          attemptId,
          questionId: q.id,
          answerText: ans?.answerText ?? null,
          isCorrect: correct,
          pointsEarned: points,
        },
        update: { isCorrect: correct, pointsEarned: points },
      });
    }
  }

  const percentage = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { languagePreference: true } });
  const lang = user?.languagePreference ?? "uz";
  const { cefrLevel, feedback } = await evaluateCefrLevel(totalScore, maxPossible, percentage, lang);

  await prisma.userExamAttempt.update({
    where: { id: attemptId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      totalScore,
      maxPossibleScore: maxPossible,
      percentage,
      cefrLevelAchieved: cefrLevel,
      cefrFeedback: feedback,
      sectionScores,
    },
  });

  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  await prisma.userProgress.upsert({
    where: { userId },
    create: {
      userId,
      totalExamsTaken: 1,
      currentCefrEstimate: cefrLevel,
      lastActivityAt: new Date(),
    },
    update: {
      totalExamsTaken: (progress?.totalExamsTaken ?? 0) + 1,
      currentCefrEstimate: cefrLevel,
      lastActivityAt: new Date(),
    },
  });

  res.json({
    attemptId,
    totalScore,
    maxPossibleScore: maxPossible,
    percentage,
    cefrLevelAchieved: cefrLevel,
    cefrFeedback: feedback,
  });
});

// GET /api/attempts/:id/results – to‘liq natija (correctAnswer, CEFR)
router.get("/:id/results", authenticateToken, async (req: AuthRequest, res: Response) => {
  const attemptId = req.params.id;
  const userId = req.userId!;

  const attempt = await prisma.userExamAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      mockExam: { select: { id: true, title: true, durationMinutes: true } },
      attemptQuestions: { orderBy: { order: "asc" } },
      answers: { include: { attemptQuestion: true, question: true } },
    },
  });
  if (!attempt) {
    res.status(404).json({ message: "Attempt topilmadi" });
    return;
  }

  const questionsWithCorrect: Array<{
    id: string;
    order: number;
    questionText: string;
    options: unknown;
    correctAnswer: unknown;
    points: number;
    maxScore: number | null;
    userAnswer: string | null;
    isCorrect: boolean | null;
    pointsEarned: number | null;
    score: number | null;
    feedback: string | null;
    section?: string;
    taskType?: string;
    rubric?: unknown;
    transcript?: string | null;
  }> = [];

  if (attempt.attemptQuestions.length > 0) {
    for (const q of attempt.attemptQuestions) {
      const ans = attempt.answers.find((a) => a.attemptQuestionId === q.id);
      questionsWithCorrect.push({
        id: q.id,
        order: q.order,
        questionText: q.questionText,
        options: q.options ? JSON.parse(q.options) : null,
        correctAnswer: q.correctAnswer,
        points: q.points,
        maxScore: q.maxScore,
        userAnswer: ans?.answerText ?? null,
        isCorrect: ans?.isCorrect ?? null,
        pointsEarned: ans?.pointsEarned ?? null,
        score: ans?.score ?? null,
        feedback: ans?.aiFeedback ?? null,
        section: q.section,
        taskType: q.taskType,
        rubric: q.rubric ? JSON.parse(q.rubric) : null,
        transcript: q.transcript,
      });
    }
  } else {
    const withPredefined = await prisma.userExamAttempt.findUnique({
      where: { id: attemptId },
      include: { mockExam: { include: { questions: { include: { question: true }, orderBy: { order: "asc" } } } }, answers: true },
    });
    if (withPredefined?.mockExam?.questions) {
      for (const mq of withPredefined.mockExam.questions) {
        const q = mq.question;
        const ans = withPredefined.answers.find((a) => a.questionId === q.id);
        questionsWithCorrect.push({
          id: q.id,
          order: mq.order,
          questionText: q.questionText,
          options: q.options ? JSON.parse(q.options) : null,
          correctAnswer: q.correctAnswer ?? "",
          points: q.points,
          maxScore: q.points,
          userAnswer: ans?.answerText ?? null,
          isCorrect: ans?.isCorrect ?? null,
          pointsEarned: ans?.pointsEarned ?? null,
          score: ans?.pointsEarned ?? null,
          feedback: ans?.aiFeedback ?? null,
        });
      }
    }
  }

  res.json({
    attemptId: attempt.id,
    status: attempt.status,
    completedAt: attempt.completedAt,
    totalScore: attempt.totalScore,
    maxPossibleScore: attempt.maxPossibleScore,
    percentage: attempt.percentage,
    cefrLevelAchieved: attempt.cefrLevelAchieved,
    cefrFeedback: attempt.cefrFeedback,
    sectionScores: attempt.sectionScores,
    exam: attempt.mockExam ?? (attempt.level ? { id: "cefr", title: `CEFR ${attempt.level}`, durationMinutes: 120 } : null),
    level: attempt.level,
    questions: questionsWithCorrect,
  });
});

export const attemptRoutes = router;
