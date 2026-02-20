// ─────────────────────────────────────────────────
// Arabic Word Counter – splits by whitespace, handles Arabic script
// ─────────────────────────────────────────────────

/**
 * Counts words in Arabic (or mixed) text.
 * Rules:
 * - Split by whitespace
 * - Ignore extra spaces
 * - Filter out empty tokens
 */
export function countArabicWords(text: string): number {
    if (!text) return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;
    // Split by any whitespace (spaces, tabs, newlines) and filter empties
    return trimmed.split(/\s+/).filter(Boolean).length;
}

/** Word count status color helpers */
export type WordCountStatus = "danger" | "warning" | "good" | "over";

export function getWordCountStatus(count: number): WordCountStatus {
    if (count < 60) return "danger";
    if (count < 80) return "warning";
    if (count <= 150) return "good";
    return "over";
}

export function getWordCountColor(status: WordCountStatus): string {
    switch (status) {
        case "danger":
            return "text-red-500";
        case "warning":
            return "text-amber-500";
        case "good":
            return "text-emerald-500";
        case "over":
            return "text-yellow-500";
    }
}

export function getWordCountBgColor(status: WordCountStatus): string {
    switch (status) {
        case "danger":
            return "bg-red-500/10 border-red-500/30";
        case "warning":
            return "bg-amber-500/10 border-amber-500/30";
        case "good":
            return "bg-emerald-500/10 border-emerald-500/30";
        case "over":
            return "bg-yellow-500/10 border-yellow-500/30";
    }
}
