/**
 * Foydalanuvchining haqiqiy subscription tier'ini aniqlaydi.
 * Agar muddati o'tgan bo'lsa, FREE qaytaradi.
 */
export function effectiveTier(tier: string, expiresAt: Date | null): string {
    if (!expiresAt || new Date() <= expiresAt) return tier;
    return "FREE";
}
