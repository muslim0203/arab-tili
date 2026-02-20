/**
 * Speaking Analysis API – At-Taanal exam
 * POST /api/speaking/analyze – receives audio, transcribes, AI scores
 */

import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { transcribeAudio } from "../services/transcribe.js";
import { aiGenerateJson, isAiAvailable } from "../lib/ai-client.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "speaking");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_AUDIO_MIMES = new Set([
    "audio/webm", "audio/mpeg", "audio/mp3", "audio/mp4",
    "audio/m4a", "audio/wav", "audio/x-wav", "audio/ogg",
    "audio/webm;codecs=opus",
]);

const upload = multer({
    dest: UPLOADS_DIR,
    limits: { fileSize: 15 * 1024 * 1024 }, // Max 15MB
    fileFilter: (_req, file, cb) => {
        const mimeOk = ALLOWED_AUDIO_MIMES.has(file.mimetype) || file.mimetype?.startsWith("audio/");
        if (mimeOk) {
            cb(null, true);
        } else {
            cb(new Error(`Ruxsat etilmagan fayl turi: ${file.mimetype}. Faqat audio fayllar qabul qilinadi.`));
        }
    },
});

const router = Router();

const analyzeBodySchema = z.object({
    questionId: z.string().min(1),
    difficulty: z.enum(["easy", "medium", "hard"]),
    prompt: z.string().min(1),
    maxScore: z.string().transform(Number).pipe(z.number().min(1).max(10)),
});

const SpeakingScoreSchema = z.object({
    score: z.number().min(0).max(5),
    fluency: z.number().min(0).max(1),
    grammar: z.number().min(0).max(1),
    vocabulary: z.number().min(0).max(1),
    pronunciation: z.number().min(0).max(1),
    coherence: z.number().min(0).max(1),
    feedback: z.string(),
});

const SPEAKING_SYSTEM_PROMPT = `Sen arab tili (fus'ha) gapirish ko'nikmalarini baholovchi ekspertsan. 
Talaba arab tilida savol javob berdi va uning javobining transkripti beriladi.

Baholash mezonlari (har biri 0-1 oralig'ida):
- fluency: ravonlik, to'xtash, takrorlashlar
- grammar: grammatik to'g'rilik 
- vocabulary: lug'at boyligi va to'g'ri ishlatilishi
- pronunciation: talaffuz sifati (transkriptdan taxminiy)
- coherence: fikrning izchilligi va mavzuga mosligi

Score: 0-5 ball (maxScore)

MUHIM: Agar transkript bo'sh yoki juda qisqa (5 so'zdan kam) bo'lsa, score 0 qo'y.
Faqat valid JSON qaytaring.`;

/**
 * POST /api/speaking/analyze
 * multipart/form-data: audio (file), questionId, difficulty, prompt, maxScore
 */
router.post("/analyze", authenticateToken, upload.single("audio"), async (req: AuthRequest, res: Response) => {
    const parsed = analyzeBodySchema.safeParse(req.body);
    if (!parsed.success) {
        if (req.file) fs.unlink(req.file.path, () => { });
        res.status(400).json({ message: "questionId, difficulty, prompt va maxScore kerak", errors: parsed.error.issues });
        return;
    }

    const { questionId, difficulty, prompt, maxScore } = parsed.data;

    // 1. Save audio file with proper extension
    let audioPath = "";
    let audioUrl = "";
    if (req.file) {
        const ext = path.extname(req.file.originalname) || ".webm";
        const finalName = `speaking_${questionId}_${Date.now()}${ext}`;
        const finalPath = path.join(UPLOADS_DIR, finalName);
        try {
            fs.renameSync(req.file.path, finalPath);
            audioPath = finalPath;
            audioUrl = `/api/uploads/speaking/${finalName}`;
        } catch {
            fs.unlink(req.file.path, () => { });
        }
    }

    // 2. Transcribe audio
    let transcript = "";
    if (audioPath && fs.existsSync(audioPath)) {
        try {
            transcript = await transcribeAudio(audioPath);
        } catch (err) {
            console.warn("[Speaking] Transcription xatosi:", (err as Error).message);
        }
    }

    // 3. AI scoring
    if (!isAiAvailable()) {
        // Fallback: random score based on difficulty
        const fallbackScores = { easy: 3, medium: 2, hard: 1 };
        const fallbackScore = transcript.length > 10 ? fallbackScores[difficulty] : 0;
        res.json({
            questionId,
            score: fallbackScore,
            feedback: "AI sozlanmagan. Taxminiy baho berildi.",
            rubric: { fluency: 0.5, grammar: 0.5, vocabulary: 0.5, pronunciation: 0.5, coherence: 0.5 },
            transcript,
            audioUrl,
        });
        return;
    }

    try {
        const result = await aiGenerateJson<Record<string, unknown>>({
            messages: [
                { role: "system", content: SPEAKING_SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `Qiyinlik darajasi: ${difficulty}
Savol (arabcha): ${prompt}
Talabaning javob transkripti: "${transcript || "(bo'sh — javob berilmagan)"}"
Maksimum ball: ${maxScore}

Quyidagi JSON formatida javob bering:
{
  "score": number (0-${maxScore}),
  "fluency": number (0-1),
  "grammar": number (0-1),
  "vocabulary": number (0-1),
  "pronunciation": number (0-1),
  "coherence": number (0-1),
  "feedback": "string (o'zbek tilida qisqa tahlil)"
}`,
                },
            ],
            maxTokens: 500,
            temperature: 0.3,
        });

        if (!result.data) {
            throw new Error("AI javob qaytarmadi");
        }

        const scored = SpeakingScoreSchema.safeParse(result.data);
        if (!scored.success) {
            console.warn("[Speaking] AI javob formati xato:", JSON.stringify(result.data).slice(0, 200));
            // Try to extract score at least
            const rawScore = typeof (result.data as Record<string, unknown>).score === "number"
                ? Math.min(maxScore, Math.max(0, (result.data as Record<string, unknown>).score as number))
                : 0;

            res.json({
                questionId,
                score: Math.round(rawScore),
                feedback: String((result.data as Record<string, unknown>).feedback ?? "Baholashda xatolik"),
                rubric: { fluency: 0.5, grammar: 0.5, vocabulary: 0.5, pronunciation: 0.5, coherence: 0.5 },
                transcript,
                audioUrl,
            });
            return;
        }

        const s = scored.data;
        res.json({
            questionId,
            score: Math.round(s.score),
            feedback: s.feedback,
            rubric: {
                fluency: s.fluency,
                grammar: s.grammar,
                vocabulary: s.vocabulary,
                pronunciation: s.pronunciation,
                coherence: s.coherence,
            },
            transcript,
            audioUrl,
        });
    } catch (err) {
        console.error("[Speaking] AI scoring xatosi:", (err as Error).message);
        res.json({
            questionId,
            score: 0,
            feedback: "Baholashda xatolik yuz berdi: " + (err as Error).message,
            rubric: { fluency: 0, grammar: 0, vocabulary: 0, pronunciation: 0, coherence: 0 },
            transcript,
            audioUrl,
        });
    }
});

export const speakingRoutes = router;
