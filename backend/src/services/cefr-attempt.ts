import { prisma } from "../lib/prisma.js";
import { selectQuestionsForAttempt, type CefrLevel } from "./question-bank.js";
import { generateWritingTasks, generateSpeakingTasks, type WritingTask, type SpeakingTask } from "./ai-writing-speaking.js";

export type CefrLevelType = CefrLevel;

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
          points: 1,
          maxScore: 1,
          audioUrl: q.audioUrl,
        },
      });
    }
  };

  await createFromBank("listening", bank.listening);
  await createFromBank("reading", bank.reading);
  await createFromBank("language_use", bank.language_use);

  let writingTasks: WritingTask[] = [];
  let speakingTasks: SpeakingTask[] = [];
  try {
    const writingRes = await generateWritingTasks(level, level === "A1" || level === "A2" ? 1 : 2);
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
          maxScore: t.maxScore,
          wordLimit: t.wordLimit,
        },
      });
    }
    const speakingRes = await generateSpeakingTasks(level);
    speakingTasks = speakingRes.tasks;
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
          maxScore: t.maxScore,
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
