// ─────────────────────────────────────────────────
// Timer Utilities – drift-resistant, Date.now()-based
// ─────────────────────────────────────────────────

/**
 * Creates a deadline from now + durationMs.
 * We store the absolute deadline so that even after tab-switching,
 * we always get the correct remaining time.
 */
export function createDeadline(durationSec: number): number {
    return Date.now() + durationSec * 1000;
}

/**
 * Returns remaining seconds (floored), minimum 0.
 */
export function getRemainingSeconds(deadline: number): number {
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
}

/**
 * Returns true if deadline has been reached or passed.
 */
export function isExpired(deadline: number): boolean {
    return Date.now() >= deadline;
}

/**
 * Formats seconds into MM:SS string.
 */
export function formatTime(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
