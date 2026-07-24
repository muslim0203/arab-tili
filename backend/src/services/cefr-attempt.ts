import { prisma } from "../lib/prisma.js";
import { selectQuestionsForAttempt, type CefrLevel } from "./question-bank.js";
import { generateWritingTasks, generateSpeakingTasks, type WritingTask, type SpeakingTask } from "./ai-writing-speaking.js";
import { MAX_SCORE_PER_SKILL } from "../lib/cefr-scoring.js";

export type CefrLevelType = CefrLevel;

/**
 * CEFR imtihon attempt yaratish.
 *
 * Har bir skill (listening, reading, grammar, writing, speaking) max 30 ball.
 * - Listening: 15 savol × 2 ball = 30
 * - Reading: 15 savol × 2 ball = 30
 * - Grammar (language_use): 15 savol × 2 ball = 30
 * - Writing: AI task(lar), jami maxScore = 30
 * - Speaking: AI task(lar), jami maxScore = 30
 */
export async function createCefrAttempt(userId: string, level: CefrLevel) {
  const attempt = await prisma.userExamAttempt.create({
    data: {
      userId,
      level,
      mockExamId: null,
      status: "IN_PROGRESS",
    },
  });

  const bank = await selectQuestionsForAttempt(level);
  let order = 0;

  const createFromBank = async (
    section: string,
    items: Awaited<ReturnType<typeof selectQuestionsForAttempt>>["listening"]
  ) => {
    for (const q of items) {
      order++;
      await prisma.attemptQuestion.create({
        data: {
          attemptId: attempt.id,
          sourceQuestionId: q.id,
          order,
          section,
          taskType: q.taskType,
          questionType: "MULTIPLE_CHOICE",
          questionText: q.prompt,
          transcript: q.transcript,
          passage: q.passage,
          options: typeof q.options === "string" ? q.options : JSON.stringify(q.options),
          correctAnswer: typeof q.correctAnswer === "string" ? q.correctAnswer : JSON.stringify(q.correctAnswer),
          rubric: typeof q.rubric === "string" ? q.rubric : (q.rubric ? JSON.stringify(q.rubric) : null),
          points: q.points, // har bir savol uchun ball (30/savollar_soni)
          maxScore: q.points,
          audioUrl: q.audioUrl,
        },
      });
    }
  };

  await createFromBank("listening", bank.listening);
  await createFromBank("reading", bank.reading);
  await createFromBank("language_use", bank.language_use);

  // Writing – jami max 30 ball
  let writingTasks: WritingTask[] = [];
  let speakingTasks: SpeakingTask[] = [];
  try {
    const writingCount = level === "A1" || level === "A2" ? 1 : 2;
    const writingMaxPerTask = Math.round(MAX_SCORE_PER_SKILL / writingCount); // 30/1=30 yoki 30/2=15
    const writingRes = await generateWritingTasks(level, writingCount);
    writingTasks = writingRes.tasks;
    for (const t of writingTasks) {
      order++;
      await prisma.attemptQuestion.create({
        data: {
          attemptId: attempt.id,
          sourceQuestionId: null,
          order,
          section: "writing",
          taskType: "essay",
          questionType: "ESSAY",
          questionText: t.prompt,
          correctAnswer: null,
          rubric: t.rubric ? JSON.stringify(t.rubric) : null,
          points: 0,
          maxScore: writingMaxPerTask, // Har bir task uchun teng taqsimlangan ball
          wordLimit: t.wordLimit,
        },
      });
    }

    // Speaking – jami max 30 ball
    const speakingRes = await generateSpeakingTasks(level);
    speakingTasks = speakingRes.tasks;
    const speakingMaxPerTask = Math.round(MAX_SCORE_PER_SKILL / Math.max(1, speakingTasks.length));
    for (const t of speakingRes.tasks) {
      order++;
      await prisma.attemptQuestion.create({
        data: {
          attemptId: attempt.id,
          sourceQuestionId: null,
          order,
          section: "speaking",
          taskType: "interview",
          questionType: "AUDIO_RESPONSE",
          questionText: t.prompt,
          correctAnswer: null,
          rubric: t.rubric ? JSON.stringify(t.rubric) : null,
          points: 0,
          maxScore: speakingMaxPerTask, // Har bir task uchun teng taqsimlangan ball
        },
      });
    }
  } catch (e) {
    await prisma.userExamAttempt.delete({ where: { id: attempt.id } }).catch(() => { });
    throw e;
  }

  return { attempt, writingTasks, speakingTasks };
}

export function normalizeCorrectAnswer(correct: unknown): string {
  if (correct == null) return "";
  if (typeof correct === "string") return correct.trim();
  return JSON.stringify(correct);
}

export function isAnswerCorrect(userAnswer: string, correctAnswer: unknown): boolean {
  const correct = normalizeCorrectAnswer(correctAnswer);
  const user = String(userAnswer ?? "").trim();
  if (correct === user) return true;
  try {
    const correctObj = typeof correctAnswer === "object" ? correctAnswer : JSON.parse(correct);
    const userObj = JSON.parse(user);
    return JSON.stringify(correctObj) === JSON.stringify(userObj);
  } catch {
    return false;
  }
}
