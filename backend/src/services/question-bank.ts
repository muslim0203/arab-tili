import { prisma } from "../lib/prisma.js";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

const SECTIONS = ["listening", "reading", "language_use"] as const;
export type BankSection = (typeof SECTIONS)[number];

const COUNTS: Record<CefrLevel, { listening: number; reading: number; language_use: number }> = {
  A1: { listening: 15, reading: 15, language_use: 15 },
  A2: { listening: 15, reading: 15, language_use: 18 },
  B1: { listening: 18, reading: 18, language_use: 22 },
  B2: { listening: 20, reading: 20, language_use: 25 },
  C1: { listening: 20, reading: 20, language_use: 28 },
  C2: { listening: 20, reading: 20, language_use: 30 },
};

export function getCountsForLevel(level: CefrLevel) {
  return COUNTS[level];
}

export async function selectBankQuestions(
  level: CefrLevel,
  section: BankSection,
  count: number
): Promise<Array<{ id: string; prompt: string; options: unknown; correctAnswer: unknown; transcript: string | null; passage: string | null; audioUrl: string | null; rubric: unknown; taskType: string; difficulty: number; tags: unknown }>> {
  const rows = await prisma.questionBank.findMany({
    where: { level, section },
    take: count * 2,
    orderBy: { id: "asc" },
  });
  const shuffled = rows.sort(() => Math.random() - 0.5).slice(0, count);
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
  }));
}

export async function selectQuestionsForAttempt(level: CefrLevel): Promise<{
  listening: Awaited<ReturnType<typeof selectBankQuestions>>;
  reading: Awaited<ReturnType<typeof selectBankQuestions>>;
  language_use: Awaited<ReturnType<typeof selectBankQuestions>>;
}> {
  const counts = getCountsForLevel(level);
  const [listening, reading, language_use] = await Promise.all([
    selectBankQuestions(level, "listening", counts.listening),
    selectBankQuestions(level, "reading", counts.reading),
    selectBankQuestions(level, "language_use", counts.language_use),
  ]);
  return { listening, reading, language_use };
}
