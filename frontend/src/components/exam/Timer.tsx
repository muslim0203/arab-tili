// ─────────────────────────────────────────────────
// Timer Component – reusable, Date.now()-based
// ─────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { getRemainingSeconds, formatTime } from "@/utils/timer";

interface TimerProps {
    deadline: number;
    onExpire: () => void;
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Show warning styling when <= this many seconds */
    warnAt?: number;
    /** Show danger styling when <= this many seconds */
    dangerAt?: number;
    /** Label above the timer */
    label?: string;
}

export function Timer({
    deadline,
    onExpire,
    size = "md",
    warnAt = 30,
    dangerAt = 10,
    label,
}: TimerProps) {
    const [remaining, setRemaining] = useState(() =>
        getRemainingSeconds(deadline)
    );

    const handleExpire = useCallback(() => {
        onExpire();
    }, [onExpire]);

    useEffect(() => {
        // Immediately compute remaining
        const updateRemaining = () => {
            const r = getRemainingSeconds(deadline);
            setRemaining(r);
            if (r <= 0) {
                handleExpire();
                return false;
            }
            return true;
        };

        // Set interval at ~250ms for smooth updates
        const interval = setInterval(() => {
            if (!updateRemaining()) {
                clearInterval(interval);
            }
        }, 250);

        // Also handle visibility change (tab switch)
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                updateRemaining();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        // Initial check
        updateRemaining();

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [deadline, handleExpire]);

    // Determine color
    let colorClass = "text-emerald-400";
    let bgClass = "bg-emerald-500/10 border-emerald-500/30";
    let ringClass = "";

    if (remaining <= dangerAt) {
        colorClass = "text-red-400";
        bgClass = "bg-red-500/15 border-red-500/40";
        ringClass = "animate-pulse";
    } else if (remaining <= warnAt) {
        colorClass = "text-amber-400";
        bgClass = "bg-amber-500/10 border-amber-500/30";
    }

    const sizeClasses = {
        sm: "text-lg px-3 py-1.5",
        md: "text-2xl px-4 py-2",
        lg: "text-4xl px-6 py-3",
    };

    return (
        <div className="flex flex-col items-center gap-1">
            {label && (
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {label}
                </span>
            )}
            <div
                className={`
          ${bgClass} ${ringClass}
          border rounded-xl font-mono font-bold tabular-nums
          ${sizeClasses[size]} ${colorClass}
          transition-colors duration-300
          backdrop-blur-sm
        `}
            >
                {formatTime(remaining)}
            </div>
        </div>
    );
}
