/**
 * Arab Exam – CEFR Baholash Tizimi
 *
 * 5 ta ko'nikma (skill), har biri max 30 ball:
 *   - grammar (language_use): Grammatika
 *   - reading: O'qish
 *   - listening: Tinglash
 *   - speaking: Gapirish
 *   - writing: Yozish
 *
 * Jami max ball: 150
 *
 * CEFR darajalar (ball asosida):
 *   0  – 24  → A1
 *   25 – 49  → A2
 *   50 – 74  → B1
 *   75 – 99  → B2
 *   100 – 124 → C1
 *   125 – 150 → C2
 */

export const SKILLS = ["grammar", "reading", "listening", "speaking", "writing"] as const;
export type Skill = (typeof SKILLS)[number];

/** Har bir skill uchun max ball */
export const MAX_SCORE_PER_SKILL = 30;

/** Jami max ball (5 × 30) */
export const MAX_TOTAL_SCORE = SKILLS.length * MAX_SCORE_PER_SKILL; // 150

/** Section nomi (DB da) dan Skill ga mapping */
export function sectionToSkill(section: string): Skill {
    const s = section.toLowerCase().replace(/\s+/g, "_");
    if (s === "language_use" || s === "grammar" || s === "language") return "grammar";
    if (s === "reading") return "reading";
    if (s === "listening") return "listening";
    if (s === "speaking") return "speaking";
    if (s === "writing") return "writing";
    return "grammar"; // fallback
}

/** Skill dan section nomiga (DB compatible) */
export function skillToSection(skill: Skill): string {
    if (skill === "grammar") return "language_use";
    return skill;
}

/** CEFR level ranges */
const CEFR_RANGES = [
    { min: 125, max: 150, level: "C2" },
    { min: 100, max: 124, level: "C1" },
    { min: 75, max: 99, level: "B2" },
    { min: 50, max: 74, level: "B1" },
    { min: 25, max: 49, level: "A2" },
    { min: 0, max: 24, level: "A1" },
] as const;

/**
 * Ball asosida CEFR darajasini aniqlash.
 * @param totalScore - jami ball (0-150)
 * @returns CEFR daraja: A1, A2, B1, B2, C1, C2
 */
export function determineCefrLevel(totalScore: number): string {
    const score = Math.max(0, Math.min(MAX_TOTAL_SCORE, Math.round(totalScore)));
    for (const range of CEFR_RANGES) {
        if (score >= range.min) return range.level;
    }
    return "A1";
}

/**
 * Skill ballaridan CEFR daraja va batafsil taqsimotni hisoblash.
 */
export function calculateCefrResult(skillScores: Record<Skill, number>): {
    totalScore: number;
    maxPossibleScore: number;
    percentage: number;
    cefrLevel: string;
    skillBreakdown: Record<Skill, { score: number; max: number; percentage: number }>;
} {
    let totalScore = 0;
    const skillBreakdown = {} as Record<Skill, { score: number; max: number; percentage: number }>;

    for (const skill of SKILLS) {
        const score = Math.max(0, Math.min(MAX_SCORE_PER_SKILL, Math.round(skillScores[skill] ?? 0)));
        totalScore += score;
        skillBreakdown[skill] = {
            score,
            max: MAX_SCORE_PER_SKILL,
            percentage: Math.round((score / MAX_SCORE_PER_SKILL) * 100),
        };
    }

    return {
        totalScore,
        maxPossibleScore: MAX_TOTAL_SCORE,
        percentage: Math.round((totalScore / MAX_TOTAL_SCORE) * 100),
        cefrLevel: determineCefrLevel(totalScore),
        skillBreakdown,
    };
}

/** CEFR daraja uchun o'zbek tilida feedback matn */
export function cefrFeedbackUz(level: string, totalScore: number): string {
    const msgs: Record<string, string> = {
        A1: `Siz ${totalScore}/150 ball oldingiz. CEFR A1 darajasi – boshlang'ich daraja. Asosiy so'z va iboralarni tushunasiz.`,
        A2: `Siz ${totalScore}/150 ball oldingiz. CEFR A2 darajasi – kundalik mavzularda oddiy gaplarni tushunasiz va foydalana olasiz.`,
        B1: `Siz ${totalScore}/150 ball oldingiz. CEFR B1 darajasi – mustaqil foydalanuvchi. Tanish mavzularda erkin muloqot qila olasiz.`,
        B2: `Siz ${totalScore}/150 ball oldingiz. CEFR B2 darajasi – yuqori o'rta daraja. Murakkab matnlarni tushunasiz va ravon gaplasha olasiz.`,
        C1: `Siz ${totalScore}/150 ball oldingiz. CEFR C1 darajasi – ilg'or daraja. Akademik va professional maqsadlarda samarali foydalanasiz.`,
        C2: `Siz ${totalScore}/150 ball oldingiz. CEFR C2 darajasi – yuqori malaka. Tilni deyarli ona tili darajasida bilasiz.`,
    };
    return msgs[level] ?? msgs.A1;
}

/** CEFR level ro'yxati (label bilan) */
export const CEFR_LEVEL_INFO = [
    { level: "A1", range: "0–24", label: "Boshlang'ich" },
    { level: "A2", range: "25–49", label: "Asosiy" },
    { level: "B1", range: "50–74", label: "Mustaqil" },
    { level: "B2", range: "75–99", label: "Yuqori O'rta" },
    { level: "C1", range: "100–124", label: "Ilg'or" },
    { level: "C2", range: "125–150", label: "Yuqori Malaka" },
] as const;
