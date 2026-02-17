import { aiGenerateJson, isAiAvailable } from "../lib/ai-client.js";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const SECTION_KEYS = ["listening", "reading", "language_use", "writing", "speaking"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const TASK_TYPES = ["mcq", "tf", "gapfill", "matching", "essay", "interview"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export type ExamTask = {
  section: SectionKey;
  task_type: TaskType;
  questionText: string;
  transcript?: string;
  text?: string;
  options?: string[] | Record<string, string>[];
  correct_answer: string | Record<string, string> | string[];
  rubric?: string | Record<string, unknown>;
  points?: number;
  word_limit?: number;
  order_in_section?: number;
};

export type FullCefrExamJson = {
  level: CefrLevel;
  sections: Array<{
    section: SectionKey;
    tasks: ExamTask[];
  }>;
};

const EXPERT_SYSTEM = `Siz CEFR asosida arab tili (fus'ha) imtihonlarini tuzuvchi ekspert siz.
Imtihon professional formatda, mavzular: ta'lim, jamiyat, texnologiya, madaniyat, iqtisod.
Har bir bo'limda darajaga mos savollar, answer key va kerak bo'lsa rubric/model answer bo'lsin.

APP uchun JSON struktura (multilevel) – faqat quyidagi formatda javob qaytaring:

{
  "level": "A1|A2|B1|B2|C1|C2",
  "sections": [
    {
      "section": "listening|reading|language_use|writing|speaking",
      "tasks": [
        {
          "task_type": "mcq|tf|gapfill|matching|essay|interview",
          "questionText": "savol matni (arabcha)",
          "transcript": "faqat listening uchun – audio transkript",
          "text": "reading/language uchun – matn",
          "options": ["variant1", "variant2"] yoki matching uchun [{"left":"A","right":"1"}],
          "correct_answer": "to'g'ri javob" yoki matching uchun {"A":"1"} yoki gapfill uchun ["j1","j2"],
          "rubric": "writing/speaking uchun baholash rubrikasi (matn yoki object)",
          "points": 1,
          "word_limit": 150
        }
      ]
    }
  ]
}

Qoidalar:
- section: listening, reading, language_use, writing, speaking (aniq shu kalitlar).
- task_type: mcq, tf, gapfill, matching, essay, interview.
- Listening: 2–3 ta task (transcript + savollar), answer key.
- Reading: 2–3 ta matn, har biriga savollar (mcq/matching), answer key.
- Language Use: 15–30 ta savol (nahw, sarf, vocabulary), qisqa izoh mumkin.
- Writing: 1–2 task, word_limit, rubric, model answer (correct_answer da).
- Speaking: script (tanishuv/monolog/munozara), baholash mezoni (rubric).
- Barcha matnlar fus'ha (standard arab).`;

export function isValidCefrLevel(level: string): level is CefrLevel {
  return CEFR_LEVELS.includes(level as CefrLevel);
}

export async function generateFullCefrExam(level: CefrLevel): Promise<FullCefrExamJson> {
  if (!isAiAvailable()) throw new Error("AI sozlanmagan (GEMINI_API_KEY yoki OPENAI_API_KEY kerak)");
  if (!isValidCefrLevel(level)) throw new Error(`Noto'g'ri daraja: ${level}`);

  const userPrompt = `Daraja: ${level}.

Quyidagi bo'limlardan iborat to'liq imtihon variantini tuzing:

1) Listening: ${level} darajaga mos 2–3 ta audio transkript, har biriga savollar (MCQ/TF/gap fill), answer key.
2) Reading: ${level} darajaga mos 2–3 ta matn, har biriga savollar (MCQ/matching), answer key.
3) Language Use: ${level} darajaga mos 15–30 ta savol (nahw + sarf + vocabulary), answer key + qisqa izoh.
4) Writing: ${level} darajaga mos 1 yoki 2 ta writing task, word limit, baholash rubrikasi, model answer.
5) Speaking: ${level} darajaga mos script (tanishuv savollari, monolog mavzulari, munozara savollari), baholash mezoni.

Natijani faqat yuqoridagi JSON struktura (level, sections, tasks) da qaytaring. Barcha matnlar arabcha (fus'ha).`;

  const result = await aiGenerateJson<Record<string, unknown>>({
    messages: [
      { role: "system", content: EXPERT_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 16000,
  });

  if (!result.data) throw new Error("AI javob bo'sh");

  const parsed = parseFullCefrExam(JSON.stringify(result.data), level);
  return parsed;
}

function parseFullCefrExam(content: string, level: CefrLevel): FullCefrExamJson {
  const raw = JSON.parse(content) as Record<string, unknown>;
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  const result: FullCefrExamJson = {
    level: (raw.level as CefrLevel) ?? level,
    sections: [],
  };

  const normalizeSectionKey = (key: string): SectionKey => {
    const k = key.toLowerCase().replace(/\s/g, "_");
    if (k === "language" || k === "language_use") return "language_use";
    if (SECTION_KEYS.includes(k as SectionKey)) return k as SectionKey;
    return "reading";
  };

  for (const sec of sections) {
    if (!sec || typeof sec !== "object") continue;
    const s = sec as Record<string, unknown>;
    const section = normalizeSectionKey(String(s.section ?? "reading"));
    const tasks = Array.isArray(s.tasks) ? s.tasks : [];
    const normalizedTasks: ExamTask[] = [];
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i] as Record<string, unknown>;
      const taskTypeRaw = String(t.task_type ?? "mcq").toLowerCase().replace(/\s/g, "");
      const taskType: TaskType = TASK_TYPES.includes(taskTypeRaw as TaskType) ? (taskTypeRaw as TaskType) : "mcq";
      const questionText = String(t.questionText ?? t.question_text ?? t.text ?? "").trim();
      const correctAnswer = t.correct_answer ?? "";
      if (!questionText && !t.transcript) continue;
      normalizedTasks.push({
        section,
        task_type: taskType,
        questionText: questionText || String(t.transcript ?? "").slice(0, 500),
        transcript: t.transcript != null ? String(t.transcript) : undefined,
        text: t.text != null ? String(t.text) : undefined,
        options: Array.isArray(t.options) ? (t.options as unknown[]) as string[] : undefined,
        correct_answer: typeof correctAnswer === "object" ? (correctAnswer as Record<string, string>) : String(correctAnswer),
        rubric: t.rubric != null ? (typeof t.rubric === "object" ? (t.rubric as Record<string, unknown>) : String(t.rubric)) : undefined,
        points: typeof t.points === "number" ? t.points : 1,
        word_limit: typeof t.word_limit === "number" ? t.word_limit : undefined,
        order_in_section: i + 1,
      });
    }
    result.sections.push({ section, tasks: normalizedTasks });
  }

  return result;
}

export type FlatTask = {
  order: number;
  section: SectionKey;
  taskType: TaskType;
  questionText: string;
  transcript?: string;
  text?: string;
  options?: string[] | Record<string, string>[];
  correct_answer: string | Record<string, string> | string[];
  rubric?: string | Record<string, unknown>;
  points: number;
  word_limit?: number;
};

export function flattenCefrExamToTasks(exam: FullCefrExamJson): FlatTask[] {
  const flat: FlatTask[] = [];
  let order = 0;
  for (const sec of exam.sections) {
    for (const task of sec.tasks) {
      order++;
      flat.push({
        order,
        section: sec.section,
        taskType: task.task_type,
        questionText: task.questionText,
        transcript: task.transcript,
        text: task.text,
        options: task.options,
        correct_answer: task.correct_answer,
        rubric: task.rubric,
        points: task.points ?? 1,
        word_limit: task.word_limit,
      });
    }
  }
  return flat;
}
