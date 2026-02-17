import xssFilter from "xss";

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
