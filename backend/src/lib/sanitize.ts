import xssFilter from "xss";
import path from "path";

// Yuklangan audio fayllar uchun ruxsat etilgan kengaytmalar (allowlist).
const ALLOWED_AUDIO_EXTS = new Set([".webm", ".mp3", ".ogg", ".oga", ".wav", ".m4a", ".aac", ".opus", ".mp4", ".flac"]);

/**
 * Foydalanuvchi yuborgan fayl nomidan xavfsiz audio kengaytma oladi.
 * Ro'yxatda bo'lmagan kengaytma (masalan .php, .html) fallback bilan almashtiriladi.
 */
export function safeAudioExt(originalname: string | undefined, fallback = ".webm"): string {
    const ext = path.extname(originalname ?? "").toLowerCase();
    return ALLOWED_AUDIO_EXTS.has(ext) ? ext : fallback;
}

/**
 * XSS va HTML injection'dan himoya qiladi.
 * Barcha string qiymatlarni tozalaydi.
 */
export function sanitize(input: string): string {
    return xssFilter(input, {
        whiteList: {},       // HTML taglar ruxsat etilmaydi
        stripIgnoreTag: true,
        stripIgnoreTagBody: ["script", "style"],
    }).trim();
}

/**
 * Object ichidagi barcha string qiymatlarni rekursiv sanitize qiladi.
 */
export function sanitizeObject<T>(obj: T): T {
    if (typeof obj === "string") return sanitize(obj) as unknown as T;
    if (Array.isArray(obj)) return obj.map(sanitizeObject) as unknown as T;
    if (obj !== null && typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = sanitizeObject(value);
        }
        return result as T;
    }
    return obj;
}
