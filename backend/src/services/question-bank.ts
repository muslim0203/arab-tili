import { prisma } from "../lib/prisma.js";
import { MAX_SCORE_PER_SKILL } from "../lib/cefr-scoring.js";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/**
 * Har bir section (listening, reading, language_use) uchun savollar soni.
 * Barcha sectionlarda max ball 30 ga teng (savollar soni × har bir savolning balli = 30).
 *
 * Masalan: 15 ta savol × 2 ball = 30 yoki 30 ta savol × 1 ball = 30
 */
const COUNTS: Record<CefrLevel, { listening: number; reading: number; language_use: number }> = {
  A1: { listening: 15, reading: 15, language_use: 15 },
  A2: { listening: 15, reading: 15, language_use: 15 },
  B1: { listening: 15, reading: 15, language_use: 15 },
  B2: { listening: 15, reading: 15, language_use: 15 },
  C1: { listening: 15, reading: 15, language_use: 15 },
  C2: { listening: 15, reading: 15, language_use: 15 },
};

/**
 * Har bir savol uchun ball hisoblash.
 * sectionMaxScore (30) / savollar soni = har bir savolning balli
 */
export function getPointsPerQuestion(level: CefrLevel, section: "listening" | "reading" | "language_use"): number {
  const count = COUNTS[level][section];
  return Math.round((MAX_SCORE_PER_SKILL / count) * 100) / 100; // 30/15 = 2
}

export function getCountsForLevel(level: CefrLevel) {
  return COUNTS[level];
}

export async function selectBankQuestions(
  level: CefrLevel,
  section: "listening" | "reading" | "language_use",
  count: number
): Promise<Array<{
  id: string; prompt: string; options: unknown; correctAnswer: unknown;
  transcript: string | null; passage: string | null; audioUrl: string | null;
  rubric: unknown; taskType: string; difficulty: number; tags: unknown;
  points: number;
}>> {
  const rows = await prisma.questionBank.findMany({
    where: { level, section },
    take: count * 2,
    orderBy: { id: "asc" },
  });
  const shuffled = rows.sort(() => Math.random() - 0.5).slice(0, count);
  // Ball haqiqiy savol soniga qarab hisoblanadi: to'liq imtihonda 30/15=2,
  // demo'da 30/3=10. Har holatda bo'lim jami 30 ballga teng bo'lib qoladi,
  // shu sabab CEFR ballash va daraja aniqlash o'zgarishsiz ishlayveradi.
  const effectiveCount = Math.max(1, shuffled.length);
  const ptsPerQ = Math.round((MAX_SCORE_PER_SKILL / effectiveCount) * 100) / 100;

  return shuffled.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    options: r.options,
    correctAnswer: r.correctAnswer,
    transcript: r.transcript,
    passage: r.passage,
    audioUrl: r.audioUrl,
    rubric: r.rubric,
    taskType: r.taskType,
    difficulty: r.difficulty,
    tags: r.tags,
    points: ptsPerQ,
  }));
}

export async function selectQuestionsForAttempt(
  level: CefrLevel,
  opts?: { perSection?: number }
): Promise<{
  listening: Awaited<ReturnType<typeof selectBankQuestions>>;
  reading: Awaited<ReturnType<typeof selectBankQuestions>>;
  language_use: Awaited<ReturnType<typeof selectBankQuestions>>;
}> {
  const counts = getCountsForLevel(level);
  // Demo imtihonda har bo'limdan cheklangan (masalan 3 ta) savol olinadi.
  const listeningN = opts?.perSection ?? counts.listening;
  const readingN = opts?.perSection ?? counts.reading;
  const languageUseN = opts?.perSection ?? counts.language_use;
  const [listening, reading, language_use] = await Promise.all([
    selectBankQuestions(level, "listening", listeningN),
    selectBankQuestions(level, "reading", readingN),
    selectBankQuestions(level, "language_use", languageUseN),
  ]);
  return { listening, reading, language_use };
}
