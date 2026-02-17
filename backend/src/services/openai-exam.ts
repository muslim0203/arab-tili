import { aiGenerate, aiGenerateJson, isAiAvailable } from "../lib/ai-client.js";
import { determineCefrLevel, cefrFeedbackUz } from "../lib/cefr-scoring.js";

export type GeneratedMcq = {
  questionText: string;
  options: string[];
  correctAnswer: string;
  points: number;
};

const MCQ_SYSTEM = `Siz arab tili o'qituvchisisiz. Vazifangiz: CEFR darajasiga mos (A1–C2) ko'p tanlovli (MCQ) savollar yaratish.
Har bir savol uchun JSON object qaytaring: { "questionText": "savol matni (arabcha)", "options": ["A variant", "B variant", "C variant", "D variant"], "correctAnswer": "to'g'ri javob (options dagi bitta to'liq matn)", "points": 1 }.
Faqat to'g'ri JSON qaytaring, boshqa matn yozmang. Savollar arab tilida bo'lsin, variantlar ham arabcha yoki talab etiladigan tilda.`;

export async function generateMcqQuestions(
  examTitle: string,
  count: number,
  languagePreference: string,
  estimatedLevel?: string
): Promise<GeneratedMcq[]> {
  if (!isAiAvailable()) {
    throw new Error("AI sozlanmagan (GEMINI_API_KEY yoki OPENAI_API_KEY kerak)");
  }
  const levelHint = estimatedLevel ? `Taxminiy daraja: ${estimatedLevel}. ` : "";
  const userPrompt = `${levelHint}Imtihon: "${examTitle}". Til: ${languagePreference}. ${count} ta MCQ savol yarating. Har biri alohida qatorda, faqat JSON object (questionText, options, correctAnswer, points).`;

  const result = await aiGenerateJson<{ questions?: GeneratedMcq[];[key: string]: unknown }>({
    messages: [
      { role: "system", content: MCQ_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 4000,
  });

  if (!result.data) throw new Error("AI javob bo'sh");
  const parsed = parseMcqResponse(result.data, count);
  return parsed;
}

function parseMcqResponse(data: Record<string, unknown>, expectedCount: number): GeneratedMcq[] {
  const results: GeneratedMcq[] = [];
  const list = Array.isArray(data.questions) ? data.questions : Array.isArray(data) ? data : [data];
  for (let i = 0; i < list.length && results.length < expectedCount; i++) {
    const item = list[i];
    if (!item || typeof item !== "object") continue;
    const questionText = String(item.questionText ?? item.question ?? "").trim();
    let options = item.options;
    if (!Array.isArray(options)) options = [];
    const correctAnswer = String(item.correctAnswer ?? options[0] ?? "").trim();
    const points = Math.max(1, parseInt(String(item.points ?? 1), 10) || 1);
    if (questionText && options.length >= 2) {
      results.push({
        questionText,
        options: options.map((o: unknown) => String(o)),
        correctAnswer: correctAnswer || options[0],
        points,
      });
    }
  }
  return results.slice(0, expectedCount);
}

const CEFR_SYSTEM = `Siz CEFR (Common European Framework) baholovchisisiz. Arab tili imtihonida olingan ball asosida CEFR darajasini aniqlang.

Baholash jadvali (5 skills × max 30 ball = max 150 ball):
- 0–24 ball: A1 (Boshlang'ich)
- 25–49 ball: A2 (Asosiy)
- 50–74 ball: B1 (Mustaqil)
- 75–99 ball: B2 (Yuqori O'rta)
- 100–124 ball: C1 (Ilg'or)
- 125–150 ball: C2 (Yuqori Malaka)

Javobni faqat quyidagi JSON formatida qaytaring: { "cefrLevel": "B1", "feedback": "qisqa tushuntirma (o'zbek tilida)" }.`;

/**
 * Ball asosida CEFR darajasini aniqlash.
 * Endi foiz o'rniga JAMI BALL ishlatiladi.
 */
export async function evaluateCefrLevel(
  totalScore: number,
  maxScore: number,
  _percentage: number,
  languagePreference: string
): Promise<{ cefrLevel: string; feedback: string }> {
  const cefrLevel = determineCefrLevel(totalScore);
  const defaultFeedback = cefrFeedbackUz(cefrLevel, totalScore);

  if (!isAiAvailable()) {
    return { cefrLevel, feedback: defaultFeedback };
  }

  try {
    const userPrompt = `Ball: ${totalScore}/${maxScore}. Til: ${languagePreference}. CEFR darajasini va qisqa feedback bering.`;

    const result = await aiGenerateJson<{ cefrLevel?: string; feedback?: string; comment?: string }>({
      messages: [
        { role: "system", content: CEFR_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 300,
    });

    if (!result.data) return { cefrLevel, feedback: defaultFeedback };

    return {
      cefrLevel,
      feedback: String(result.data.feedback ?? result.data.comment ?? "").slice(0, 500) || defaultFeedback,
    };
  } catch {
    return { cefrLevel, feedback: defaultFeedback };
  }
}
