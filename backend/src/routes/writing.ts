/**
 * Writing Analysis API – At-Taanal exam
 * POST /api/writing/analyze – receives text, AI scores with rubric
 */

import { Router, Response } from "express";
import { z } from "zod";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { aiGenerateJson, isAiAvailable } from "../lib/ai-client.js";

const router = Router();

const analyzeBodySchema = z.object({
    taskId: z.string().min(1),
    difficulty: z.enum(["easy", "hard"]),
    prompt: z.string().min(1),
    text: z.string(),
    maxScore: z.number().min(1).max(30),
});

const WritingScoreSchema = z.object({
    score: z.number().min(0).max(15),
    content: z.number().min(0).max(3),
    organization: z.number().min(0).max(3),
    grammar: z.number().min(0).max(3),
    vocabulary: z.number().min(0).max(3),
    taskAchievement: z.number().min(0).max(3),
    feedback: z.string(),
});

const WRITING_SYSTEM_PROMPT = `Sen arab tili (fus'ha) yozma ko'nikmalarini baholovchi ekspertsan.
Talaba arab tilida yozuv vazifasini bajardi. Uning javobini baholab, batafsil tahlil qilishing kerak.

Baholash mezonlari (har biri 0-3 ball):
- content: Mazmun muvofiqligi — mavzuga mos kelishi, dalillar yetarliligi
- organization: Tashkiliy tuzilma — xatboshilar, mantiqiy izchillik, bog'lovchilar
- grammar: Grammatik to'g'rilik — i'rob, fe'l tasriflari, jumlalar tuzilishi
- vocabulary: Lug'at boyligi — so'z xilma-xilligi, kontekstga mos ishlatilishi
- taskAchievement: Vazifa bajarilishi — topshiriq talablariga javob berishi

Score: yuqoridagi 5 mezonning yig'indisi (0-15 ball)

MUHIM:
- Agar matn bo'sh yoki juda qisqa (5 so'zdan kam) bo'lsa, score 0 qo'y.
- Agar matn arab tilida emas bo'lsa, score 0 qo'y. 
- feedback ni o'zbek tilida yozing.
- Faqat valid JSON qaytaring.`;

/**
 * POST /api/writing/analyze
 * JSON body: { taskId, difficulty, prompt, text, maxScore }
 */
router.post("/analyze", authenticateToken, async (req: AuthRequest, res: Response) => {
    const parsed = analyzeBodySchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "taskId, difficulty, prompt, text va maxScore kerak", errors: parsed.error.issues });
        return;
    }

    const { taskId, difficulty, prompt, text, maxScore } = parsed.data;

    // Quick word count
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

    // If AI not available, fallback
    if (!isAiAvailable()) {
        const fallbackScores = { easy: 8, hard: 5 };
        const fallbackScore = wordCount > 10 ? fallbackScores[difficulty] : 0;
        res.json({
            taskId,
            score: fallbackScore,
            content: Math.round(fallbackScore / 5),
            organization: Math.round(fallbackScore / 5),
            grammar: Math.round(fallbackScore / 5),
            vocabulary: Math.round(fallbackScore / 5),
            taskAchievement: Math.round(fallbackScore / 5),
            feedback: "AI sozlanmagan. Taxminiy baho berildi.",
        });
        return;
    }

    try {
        const result = await aiGenerateJson<Record<string, unknown>>({
            messages: [
                { role: "system", content: WRITING_SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `Qiyinlik darajasi: ${difficulty}
Vazifa (arabcha): ${prompt}
Talabaning javobi (${wordCount} so'z): "${text || "(bo'sh — javob berilmagan)"}"
Maksimum ball: ${maxScore}

Quyidagi JSON formatida javob bering:
{
  "score": number (0-${maxScore}, 5 mezon yig'indisi),
  "content": number (0-3),
  "organization": number (0-3),
  "grammar": number (0-3),
  "vocabulary": number (0-3),
  "taskAchievement": number (0-3),
  "feedback": "string (o'zbek tilida batafsil tahlil)"
}`,
                },
            ],
            maxTokens: 700,
            temperature: 0.3,
        });

        if (!result.data) {
            throw new Error("AI javob qaytarmadi");
        }

        const scored = WritingScoreSchema.safeParse(result.data);
        if (!scored.success) {
            console.warn("[Writing] AI javob formati xato:", JSON.stringify(result.data).slice(0, 300));
            // Try to extract score at least
            const raw = result.data as Record<string, unknown>;
            const rawScore = typeof raw.score === "number"
                ? Math.min(maxScore, Math.max(0, raw.score))
                : 0;

            res.json({
                taskId,
                score: Math.round(rawScore),
                content: typeof raw.content === "number" ? Math.min(3, Math.max(0, raw.content)) : 0,
                organization: typeof raw.organization === "number" ? Math.min(3, Math.max(0, raw.organization)) : 0,
                grammar: typeof raw.grammar === "number" ? Math.min(3, Math.max(0, raw.grammar)) : 0,
                vocabulary: typeof raw.vocabulary === "number" ? Math.min(3, Math.max(0, raw.vocabulary)) : 0,
                taskAchievement: typeof raw.taskAchievement === "number" ? Math.min(3, Math.max(0, raw.taskAchievement)) : 0,
                feedback: String(raw.feedback ?? "Baholashda xatolik"),
            });
            return;
        }

        const s = scored.data;
        res.json({
            taskId,
            score: s.score,
            content: s.content,
            organization: s.organization,
            grammar: s.grammar,
            vocabulary: s.vocabulary,
            taskAchievement: s.taskAchievement,
            feedback: s.feedback,
        });
    } catch (err) {
        console.error("[Writing] AI scoring xatosi:", (err as Error).message);
        res.json({
            taskId,
            score: 0,
            content: 0,
            organization: 0,
            grammar: 0,
            vocabulary: 0,
            taskAchievement: 0,
            feedback: "Baholashda xatolik yuz berdi: " + (err as Error).message,
        });
    }
});

export const writingRoutes = router;
