import OpenAI from "openai";
import { config } from "../config.js";

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

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
  if (!openai) {
    throw new Error("OPENAI_API_KEY sozlanmagan");
  }
  const levelHint = estimatedLevel ? `Taxminiy daraja: ${estimatedLevel}. ` : "";
  const userPrompt = `${levelHint}Imtihon: "${examTitle}". Til: ${languagePreference}. ${count} ta MCQ savol yarating. Har biri alohida qatorda, faqat JSON object (questionText, options, correctAnswer, points).`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: MCQ_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("AI javob bo'sh");

  const parsed = parseMcqResponse(content, count);
  return parsed;
}

function parseMcqResponse(content: string, expectedCount: number): GeneratedMcq[] {
  const results: GeneratedMcq[] = [];
  try {
    const obj = JSON.parse(content);
    const list = Array.isArray(obj.questions) ? obj.questions : Array.isArray(obj) ? obj : [obj];
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
  } catch {
    const lines = content.split("\n").filter((l) => l.trim().startsWith("{"));
    for (const line of lines) {
      if (results.length >= expectedCount) break;
      try {
        const item = JSON.parse(line);
        const questionText = String(item.questionText ?? item.question ?? "").trim();
        const options = Array.isArray(item.options) ? item.options.map((o: unknown) => String(o)) : [];
        const correctAnswer = String(item.correctAnswer ?? options[0] ?? "").trim();
        if (questionText && options.length >= 2) {
          results.push({
            questionText,
            options,
            correctAnswer: correctAnswer || options[0],
            points: Math.max(1, parseInt(String(item.points ?? 1), 10) || 1),
          });
        }
      } catch {
        // skip invalid line
      }
    }
  }
  return results.slice(0, expectedCount);
}

const CEFR_SYSTEM = `Siz CEFR (Common European Framework) baholovchisisiz. Arab tili imtihonida olingan ball va foiz asosida CEFR darajasini aniqlang.
Darajalar: A1, A2, B1, B2, C1, C2.
Javobni faqat quyidagi JSON formatida qaytaring: { "cefrLevel": "A2", "feedback": "qisqa tushuntirma (o'zbek yoki rus tilida)" }.`;

export async function evaluateCefrLevel(
  totalScore: number,
  maxScore: number,
  percentage: number,
  languagePreference: string
): Promise<{ cefrLevel: string; feedback: string }> {
  if (!openai) {
    return {
      cefrLevel: percentage >= 90 ? "C2" : percentage >= 75 ? "C1" : percentage >= 60 ? "B2" : percentage >= 45 ? "B1" : percentage >= 30 ? "A2" : "A1",
      feedback: "CEFR darajasi ball asosida hisoblandi (AI sozlanmagan).",
    };
  }
  const userPrompt = `Ball: ${totalScore}/${maxScore}, foiz: ${percentage.toFixed(1)}%. Til: ${languagePreference}. CEFR darajasini va qisqa feedback bering.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: CEFR_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    return {
      cefrLevel: percentage >= 60 ? "B2" : percentage >= 30 ? "A2" : "A1",
      feedback: "Daraja ball asosida aniqlandi.",
    };
  }
  try {
    const obj = JSON.parse(content);
    return {
      cefrLevel: String(obj.cefrLevel ?? obj.level ?? "A1").replace(/[^A-C1-2]/g, "").slice(0, 2) || "A1",
      feedback: String(obj.feedback ?? obj.comment ?? "").slice(0, 500) || "Baholash yakunlandi.",
    };
  } catch {
    return {
      cefrLevel: percentage >= 60 ? "B2" : percentage >= 30 ? "A2" : "A1",
      feedback: "Baholash yakunlandi.",
    };
  }
}
