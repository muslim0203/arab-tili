// ─────────────────────────────────────────────────
// Scoring Utilities
// ─────────────────────────────────────────────────

import type { Answer, CEFRLevel } from "@/types/exam";

/**
 * Grammar: 1 point per correct answer.  Max 30.
 */
export function calcGrammarScore(answers: Answer[]): number {
    return answers.filter((a) => a.isCorrect === true).length;
}

/**
 * Reading: total 24 questions, scaled to 30.
 *   readingScore = round((correctCount / 24) * 30)
 */
export function calcReadingScore(answers: Answer[]): {
    rawCorrect: number;
    scaled: number;
} {
    const rawCorrect = answers.filter((a) => a.isCorrect === true).length;
    const scaled = Math.round((rawCorrect / 24) * 30);
    return { rawCorrect, scaled };
}

/**
 * Determine CEFR level from total score (out of 150).
 * Since we only have grammar + reading now (max 60),
 * we extrapolate to 150 with a note.
 */
export function getCEFRLevel(totalOf150: number): CEFRLevel {
    if (totalOf150 >= 125) return "C2";
    if (totalOf150 >= 100) return "C1";
    if (totalOf150 >= 75) return "B2";
    if (totalOf150 >= 50) return "B1";
    if (totalOf150 >= 25) return "A2";
    return "Below A2";
}

/**
 * Extrapolate partial score (grammar + reading, max 60)
 * to an estimated score out of 150, assuming proportional performance
 * across all 5 skills.
 */
export function extrapolateToFull(partialScore: number, partialMax: number): number {
    if (partialMax === 0) return 0;
    return Math.round((partialScore / partialMax) * 150);
}

/**
 * Generate a simple unique ID.
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
