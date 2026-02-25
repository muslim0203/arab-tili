import { motion } from "framer-motion";
import type { AccessStatus } from "@/pages/PricingPage";
import { QuotaIndicator } from "./QuotaIndicator";
import { Crown, Calendar } from "lucide-react";

type UsageDashboardProps = {
    status: AccessStatus;
};

export function UsageDashboard({ status }: UsageDashboardProps) {
    const expiresAt = status.subscription.expiresAt
        ? new Date(status.subscription.expiresAt)
        : null;

    const daysLeft = expiresAt
        ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    return (
        <div className="rounded-2xl border border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 p-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Crown className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Pro Dashboard</h3>
                        <p className="text-sm text-muted-foreground">Oylik foydalanish ko'rsatkichlari</p>
                    </div>
                </div>

                {expiresAt && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100/60 dark:bg-amber-900/30">
                        <Calendar className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            {daysLeft} kun qoldi
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <QuotaIndicator
                        label="Mock imtihonlar"
                        used={status.usage.mock.used}
                        limit={status.usage.mock.limit}
                        color="blue"
                        showBar
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <QuotaIndicator
                        label="Writing AI"
                        used={status.usage.writing.used}
                        limit={status.usage.writing.limit}
                        color="emerald"
                        showBar
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <QuotaIndicator
                        label="Speaking AI"
                        used={status.usage.speaking.used}
                        limit={status.usage.speaking.limit}
                        color="purple"
                        showBar
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <QuotaIndicator
                        label="AI Tutor"
                        used={status.usage.aiTutor.used}
                        limit={status.usage.aiTutor.limit}
                        color="amber"
                        showBar
                    />
                </motion.div>
            </div>
        </div>
    );
}
