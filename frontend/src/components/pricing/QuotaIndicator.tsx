import { motion } from "framer-motion";

type QuotaIndicatorProps = {
    label: string;
    used: number;
    limit: number;
    color: "blue" | "emerald" | "purple" | "amber" | "orange";
    showBar?: boolean;
};

const colorMap = {
    blue: {
        bg: "bg-blue-50 dark:bg-blue-950/20",
        barBg: "bg-blue-100 dark:bg-blue-900/30",
        barFill: "bg-blue-500",
        text: "text-blue-700 dark:text-blue-400",
        badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    },
    emerald: {
        bg: "bg-emerald-50 dark:bg-emerald-950/20",
        barBg: "bg-emerald-100 dark:bg-emerald-900/30",
        barFill: "bg-emerald-500",
        text: "text-emerald-700 dark:text-emerald-400",
        badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    },
    purple: {
        bg: "bg-purple-50 dark:bg-purple-950/20",
        barBg: "bg-purple-100 dark:bg-purple-900/30",
        barFill: "bg-purple-500",
        text: "text-purple-700 dark:text-purple-400",
        badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    },
    amber: {
        bg: "bg-amber-50 dark:bg-amber-950/20",
        barBg: "bg-amber-100 dark:bg-amber-900/30",
        barFill: "bg-amber-500",
        text: "text-amber-700 dark:text-amber-400",
        badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    },
    orange: {
        bg: "bg-orange-50 dark:bg-orange-950/20",
        barBg: "bg-orange-100 dark:bg-orange-900/30",
        barFill: "bg-orange-500",
        text: "text-orange-700 dark:text-orange-400",
        badge: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
    },
};

export function QuotaIndicator({ label, used, limit, color, showBar = false }: QuotaIndicatorProps) {
    const remaining = Math.max(0, limit - used);
    const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    const isExhausted = remaining === 0 && limit > 0;
    const c = colorMap[color];

    if (showBar) {
        return (
            <div className={`rounded-xl ${c.bg} p-4`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                        {remaining} / {limit}
                    </span>
                </div>

                {/* Progress bar */}
                <div className={`h-2.5 rounded-full ${c.barBg} overflow-hidden`}>
                    <motion.div
                        className={`h-full rounded-full ${isExhausted ? "bg-red-500" : c.barFill}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>

                {isExhausted && (
                    <p className="text-xs text-red-500 font-medium mt-1.5">
                        Limit tugadi
                    </p>
                )}
            </div>
        );
    }

    // Compact view
    return (
        <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                {remaining} / {limit}
            </span>
            <span className="text-xs text-muted-foreground">{label} qoldi</span>
        </div>
    );
}
