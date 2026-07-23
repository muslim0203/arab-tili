/**
 * Tinglab tushunish (listening) savollari uchun umumiy tiplar va yordamchi funksiyalar.
 *
 * Bu fayl IKKI joyda ishlatiladi:
 *   1. `prisma/seed-listening-*.ts` — savollarni bazaga yozadi (audioUrl shu yerdan hisoblanadi).
 *   2. `scripts/generate-listening-audio.ts` — transkriptlardan ElevenLabs TTS orqali mp3 yasaydi.
 *
 * Shuning uchun fayl nomi FAQAT shu yerda hisoblanadi (`audioFileName`) — ikkala tomon
 * bir xil nomdan foydalanadi va nomlar hech qachon bir-biridan uzilib qolmaydi.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/** Dialogdagi bitta replika. `A` va `B` — ikki xil ovoz bilan o'qiladi. */
export interface DialogueLine {
    speaker: "A" | "B";
    text: string;
}

/**
 * Bitta tinglash savoli.
 *
 * Audio manbasi ikki ko'rinishda bo'ladi:
 *  - `lines`      — dialog (easy / medium): har replika o'z ovozi bilan o'qiladi;
 *  - `transcript` — monolog/ma'ruza (hard): bitta narrator ovozi.
 *
 * Aynan bittasi to'ldirilishi shart (`validateItems` buni tekshiradi).
 * Bu maydonlar DB'da saqlanmaydi — ular TTS manbasi va kelajakda transkriptni ko'rsatish uchun.
 */
export interface ListeningItem {
    /** Dialog replikalari (easy / medium). */
    lines?: DialogueLine[];
    /** Monolog matni (hard). */
    transcript?: string;
    /** Arabcha savol matni. */
    prompt: string;
    /** Aynan 4 ta arabcha variant. */
    options: string[];
    /** To'g'ri javob indeksi (0..3). */
    correctIndex: number;
}

export type ListeningDifficulty = "easy" | "medium" | "hard";

/**
 * Savolning to'liq matnini qaytaradi (dialog bo'lsa replikalar birlashtiriladi).
 * Kelajakda transkriptni ekranda ko'rsatish yoki eksport qilish uchun.
 */
export function fullTranscript(item: ListeningItem): string {
    if (item.lines && item.lines.length > 0) {
        return item.lines.map((l) => l.text).join("\n");
    }
    return item.transcript ?? "";
}

/** Har bir daraja qaysi ListeningStage.stageType ga tegishli. */
export const STAGE_TYPE_BY_DIFFICULTY: Record<ListeningDifficulty, string> = {
    easy: "short_dialogue",
    medium: "long_conversation",
    hard: "lecture",
};

/** Stage yo'q bo'lsa yaratish uchun standart qiymatlar (prisma/seed.ts bilan bir xil). */
export const STAGE_DEFAULTS: Record<
    ListeningDifficulty,
    { stageType: string; titleArabic: string; timingMode: string; perQuestionSeconds: number | null; totalSeconds: number | null }
> = {
    easy: {
        stageType: "short_dialogue",
        titleArabic: "المحادثة القصيرة بين رجل والمرأة",
        timingMode: "per_question",
        perQuestionSeconds: 60,
        totalSeconds: null,
    },
    medium: {
        stageType: "long_conversation",
        titleArabic: "رواية وسؤال / المحادثة الطويلة",
        timingMode: "total",
        perQuestionSeconds: null,
        totalSeconds: 420,
    },
    hard: {
        stageType: "lecture",
        titleArabic: "المحاضرة",
        timingMode: "total",
        perQuestionSeconds: null,
        totalSeconds: 420,
    },
};

/** Har bir darajada audioni necha marta tinglash mumkin. */
export const MAX_PLAYS_BY_DIFFICULTY: Record<ListeningDifficulty, number> = {
    easy: 2,
    medium: 2,
    hard: 1,
};

/**
 * Barqaror fayl nomi: `listening-easy-01.mp3`.
 * @param index 0 dan boshlanadigan savol tartibi (orderIndex bilan bir xil).
 */
export function audioFileName(difficulty: ListeningDifficulty, index: number): string {
    const n = String(index + 1).padStart(2, "0");
    return `listening-${difficulty}-${n}.mp3`;
}

/** DO Spaces bucket ichidagi barqaror kalit: `listening/easy/listening-easy-01.mp3`. */
export function audioObjectKey(difficulty: ListeningDifficulty, index: number): string {
    return `listening/${difficulty}/${audioFileName(difficulty, index)}`;
}

// ══════════════════════════════════════════════════════════
// Audio xaritasi (key → public URL)
// ══════════════════════════════════════════════════════════

/**
 * `scripts/generate-listening-audio.ts` audiolarni Spaces'ga yuklagach shu faylni yozadi.
 * Seed skriptlar `audioUrl` ni AYNAN shu yerdan oladi — lokal yo'l ishlatilmaydi.
 */
export const AUDIO_MAP_FILENAME = "listening-audio-map.json";

/** Xarita fayli prisma/ papkasida yotadi. */
export function audioMapPath(): string {
    return path.join(path.dirname(fileURLToPath(import.meta.url)), AUDIO_MAP_FILENAME);
}

/** `{ "listening/easy/listening-easy-01.mp3": "https://bucket.fra1.digitaloceanspaces.com/..." }` */
export type AudioMap = Record<string, string>;

const GENERATE_HINT =
    "Avval audiolarni generatsiya qiling:\n" +
    "   cd backend && npx tsx scripts/generate-listening-audio.ts";

/** Xaritani o'qiydi. Fayl yo'q bo'lsa aniq xato tashlaydi (jim qolmaydi). */
export function loadAudioMap(): AudioMap {
    const p = audioMapPath();
    if (!fs.existsSync(p)) {
        throw new Error(`Audio xaritasi topilmadi: ${p}\n${GENERATE_HINT}`);
    }
    const raw = fs.readFileSync(p, "utf8");
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`Audio xaritasi buzilgan JSON: ${p}\n${GENERATE_HINT}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`Audio xaritasi noto'g'ri formatda (obyekt kutilgan edi): ${p}`);
    }
    return parsed as AudioMap;
}

/**
 * Xaritani o'qiydi, fayl yo'q bo'lsa bo'sh obyekt qaytaradi (xato tashlamaydi).
 * TTS skripti uchun: mavjud xarita ustiga qo'shib boradi.
 */
export function loadAudioMapSafe(): AudioMap {
    const p = audioMapPath();
    if (!fs.existsSync(p)) return {};
    try {
        const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as AudioMap;
        }
    } catch {
        // buzilgan fayl — bo'shdan boshlaymiz
    }
    return {};
}

/** Xaritadan public URL oladi. Kalit yo'q bo'lsa aniq xato tashlaydi. */
export function audioUrlFromMap(map: AudioMap, difficulty: ListeningDifficulty, index: number): string {
    const key = audioObjectKey(difficulty, index);
    const url = map[key];
    if (!url || typeof url !== "string") {
        throw new Error(`Audio xaritasida kalit yo'q: ${key}\n${GENERATE_HINT}`);
    }
    if (!/^https?:\/\//.test(url)) {
        throw new Error(`Audio xaritasidagi URL to'liq emas (https kutilgan edi): ${key} → ${url}`);
    }
    return url;
}

/**
 * Savollar massivini tekshiradi: matn bor, 4 ta variant, correctIndex 0..3,
 * variantlar takrorlanmaydi. Xatolar ro'yxatini qaytaradi (bo'sh massiv = hammasi joyida).
 */
export function validateItems(difficulty: ListeningDifficulty, items: ListeningItem[]): string[] {
    const errors: string[] = [];
    items.forEach((item, i) => {
        const tag = `${difficulty}[${i + 1}]`;

        const hasLines = Array.isArray(item.lines) && item.lines.length > 0;
        const hasTranscript = typeof item.transcript === "string" && item.transcript.trim().length > 0;
        if (hasLines === hasTranscript) {
            errors.push(`${tag}: aynan bittasi bo'lishi kerak — 'lines' (dialog) yoki 'transcript' (monolog)`);
        }
        if (hasLines) {
            item.lines!.forEach((line, j) => {
                if (line.speaker !== "A" && line.speaker !== "B") {
                    errors.push(`${tag}.line[${j + 1}]: speaker "A" yoki "B" bo'lishi kerak`);
                }
                if (!line.text || !line.text.trim()) {
                    errors.push(`${tag}.line[${j + 1}]: matn bo'sh`);
                }
            });
            if (new Set(item.lines!.map((l) => l.speaker)).size < 2) {
                errors.push(`${tag}: dialogda ikkala spiker ham bo'lishi kerak (A va B)`);
            }
        }
        if (fullTranscript(item).trim().length < 20) {
            errors.push(`${tag}: matn juda qisqa`);
        }
        if (!item.prompt || !item.prompt.trim()) {
            errors.push(`${tag}: prompt bo'sh`);
        }
        if (!Array.isArray(item.options) || item.options.length !== 4) {
            errors.push(`${tag}: options uzunligi ${item.options?.length ?? 0}, 4 bo'lishi kerak`);
        } else {
            if (item.options.some((o) => !o || !o.trim())) {
                errors.push(`${tag}: bo'sh variant bor`);
            }
            if (new Set(item.options.map((o) => o.trim())).size !== 4) {
                errors.push(`${tag}: takrorlanuvchi variantlar bor`);
            }
        }
        if (!Number.isInteger(item.correctIndex) || item.correctIndex < 0 || item.correctIndex > 3) {
            errors.push(`${tag}: correctIndex = ${item.correctIndex}, 0..3 oralig'ida bo'lishi kerak`);
        }
    });
    return errors;
}

// ══════════════════════════════════════════════════════════
// ElevenLabs TTS sozlamalari
// ══════════════════════════════════════════════════════════

/**
 * OVOZ ID'LARI — o'zingizning ElevenLabs akkountingizdagi ID'lar bilan almashtiring.
 *
 * Bu yerdagilar ElevenLabs'ning standart ("premade") multilingual ovozlari:
 *   male     — Adam   (pnInz6obpgDQGcFmaJgB)  → dialogda "A" spiker (erkak)
 *   female   — Rachel (21m00Tcm4TlvDq8ikWAM)  → dialogda "B" spiker (ayol)
 *   narrator — Antoni (ErXwobaYiN019PkySvjV)  → ma'ruza (hard) uchun
 *
 * Voice ID'ni topish: https://elevenlabs.io/app/voice-library → ovozni tanlang → "ID" ni nusxalang,
 * yoki API: GET https://api.elevenlabs.io/v1/voices (xh-header: xi-api-key).
 * Arabcha uchun ovozni tanlashda "Multilingual" belgisi borligiga e'tibor bering.
 */
export const VOICES = {
    male: "pnInz6obpgDQGcFmaJgB",
    female: "21m00Tcm4TlvDq8ikWAM",
    narrator: "ErXwobaYiN019PkySvjV",
} as const;

/**
 * TTS modeli.
 * `eleven_multilingual_v2` — arabchani barqaror qo'llab-quvvatlaydi va default sifatida qoladi.
 * Eslatma: yangiroq `eleven_v3` ifodaliroq, lekin hali barcha akkountlarda ochiq emas va
 * narxi/xulqi o'zgaruvchan — shuning uchun uni faqat qo'lda sinab ko'rgandan keyin qo'ying.
 */
export const TTS_MODEL_ID = "eleven_multilingual_v2";

/** Chiqish formati — 44.1 kHz, 128 kbps mp3. */
export const TTS_OUTPUT_FORMAT = "mp3_44100_128";

/** Har bir daraja uchun ovoz va o'qish sozlamalari. */
export const TTS_SETTINGS: Record<
    ListeningDifficulty,
    { stability: number; similarity_boost: number; style: number; speed: number }
> = {
    // Oson: sekinroq va barqarorroq talaffuz (A1–A2 uchun).
    easy: { stability: 0.55, similarity_boost: 0.8, style: 0.15, speed: 0.9 },
    // O'rta: tabiiy suhbat sur'ati.
    medium: { stability: 0.5, similarity_boost: 0.8, style: 0.2, speed: 1.0 },
    // Qiyin: ma'ruza ohangi, normal sur'at.
    hard: { stability: 0.45, similarity_boost: 0.75, style: 0.3, speed: 1.0 },
};
