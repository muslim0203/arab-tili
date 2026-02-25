import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/app/AppLayout";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { UpgradeModal } from "@/components/pricing/UpgradeModal";
import { UsageDashboard } from "@/components/pricing/UsageDashboard";
import { QuotaIndicator } from "@/components/pricing/QuotaIndicator";
import {
    Loader2,
    Check,
    X,
    Crown,
    Zap,
    BookOpen,
    Shield,
    Sparkles,
    ArrowRight,
} from "lucide-react";

export type AccessStatus = {
    planType: "free" | "standard" | "pro";
    subscription: {
        active: boolean;
        expiresAt: string | null;
    };
    purchases: {
        mockExam: {
            available: number;
            expiresAt: string | null;
        };
    };
    usage: {
        mock: { used: number; limit: number };
        writing: { used: number; limit: number };
        speaking: { used: number; limit: number };
        aiTutor: { used: number; limit: number };
    };
    access: {
        fullSarf: boolean;
        mockExam: boolean;
        writingAI: boolean;
        speakingAI: boolean;
        aiTutor: boolean;
    };
};

const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

export function PricingPage() {
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeTarget, setUpgradeTarget] = useState<"standard" | "pro">("pro");
    const queryClient = useQueryClient();

    const { data: status, isLoading } = useQuery<AccessStatus>({
        queryKey: ["access-status"],
        queryFn: () => api<AccessStatus>("/access/status"),
        refetchInterval: 30_000,
    });

    const purchaseMock = useMutation({
        mutationFn: () => api("/access/purchase/mock", { method: "POST", body: {} }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["access-status"] });
            setShowUpgradeModal(false);
        },
    });

    const subscribePro = useMutation({
        mutationFn: (priceLevel: "basic" | "premium") =>
            api("/access/subscribe/pro", { method: "POST", body: { priceLevel } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["access-status"] });
            setShowUpgradeModal(false);
            const currentUser = useAuthStore.getState().user;
            if (currentUser) {
                useAuthStore.getState().setAuth(
                    { ...currentUser, subscriptionTier: "PRO" },
                    useAuthStore.getState().accessToken!,
                    useAuthStore.getState().refreshToken!
                );
            }
        },
    });

    const handleUpgrade = (target: "standard" | "pro") => {
        setUpgradeTarget(target);
        setShowUpgradeModal(true);
    };

    const planType = status?.planType ?? "free";

    const freeCardClass = planType === "free"
        ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-lg shadow-emerald-500/5"
        : "border-border/50 bg-card hover:border-border hover:shadow-md";

    const standardCardClass = planType === "standard"
        ? "border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/10 shadow-lg shadow-blue-500/5"
        : "border-border/50 bg-card hover:border-border hover:shadow-md";

    const proCardClass = planType === "pro"
        ? "border-amber-500/50 bg-gradient-to-b from-amber-50/40 to-orange-50/20 dark:from-amber-950/20 dark:to-orange-950/10 shadow-xl shadow-amber-500/10"
        : "border-primary/30 bg-gradient-to-b from-primary/5 to-transparent shadow-lg hover:shadow-xl hover:border-primary/50";

    const proBadgeClass = planType === "pro"
        ? "bg-gradient-to-r from-amber-500 to-orange-500"
        : "bg-gradient-to-r from-primary to-primary/80";

    return (
        <AppLayout>
            <motion.div
                className="space-y-10 pb-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Header */}
                <div className="text-center space-y-3">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                            <Sparkles className="h-4 w-4" />
                            Tariflar va obunalar
                        </span>
                    </motion.div>
                    <PageHeader
                        title="O'zingizga mos rejani tanlang"
                        subtitle="At-Taanal arab tili imtihon platformasi uchun qulay narxlar"
                    />
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
                    </div>
                ) : (
                    <>
                        {/* Usage Dashboard for Pro users */}
                        {planType === "pro" && status && (
                            <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
                                <UsageDashboard status={status} />
                            </motion.div>
                        )}

                        {/* Plan Cards Grid */}
                        <div className="grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto">

                            {/* FREE PLAN */}
                            <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                                <div className={`relative flex flex-col h-full rounded-2xl border p-6 transition-all duration-300 ${freeCardClass}`}>
                                    {planType === "free" && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                            <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-md">
                                                Joriy reja
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-11 w-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                            <BookOpen className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground">Bepul</h3>
                                            <p className="text-xs text-muted-foreground">Boshlang'ich</p>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <p className="text-3xl font-extrabold text-foreground">
                                            0
                                            <span className="text-sm font-normal text-muted-foreground ml-1">so'm</span>
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">Abadiy bepul</p>
                                    </div>

                                    <ul className="space-y-3 flex-1 mb-6">
                                        {[
                                            { text: "Sarf asoslari (cheklangan)", included: true },
                                            { text: "1 Mock demo (qisman)", included: true },
                                            { text: "1 Writing demo (cheklangan AI)", included: true },
                                            { text: "1 Speaking demo (1 savol)", included: true },
                                            { text: "To'liq mock imtihon", included: false },
                                            { text: "AI Tutor", included: false },
                                            { text: "Progress tracking", included: false },
                                        ].map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm">
                                                {feature.included ? (
                                                    <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                    </div>
                                                ) : (
                                                    <div className="h-5 w-5 rounded-full bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                                                        <X className="h-3 w-3 text-muted-foreground/60" />
                                                    </div>
                                                )}
                                                <span className={feature.included ? "text-foreground" : "text-muted-foreground/60 line-through"}>
                                                    {feature.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {planType === "free" ? (
                                        <div className="w-full py-3 rounded-xl bg-muted/50 text-center text-sm font-medium text-muted-foreground">
                                            Hozirgi rejangiz
                                        </div>
                                    ) : (
                                        <div className="w-full py-3 rounded-xl bg-muted/30 text-center text-sm text-muted-foreground">
                                            Asosiy reja
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* STANDARD PLAN */}
                            <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
                                <div className={`relative flex flex-col h-full rounded-2xl border p-6 transition-all duration-300 ${standardCardClass}`}>
                                    {planType === "standard" && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                            <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-bold shadow-md">
                                                Joriy reja
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-11 w-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <Zap className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground">Standard</h3>
                                            <p className="text-xs text-muted-foreground">Bir martalik</p>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <p className="text-3xl font-extrabold text-foreground">
                                            50,000
                                            <span className="text-sm font-normal text-muted-foreground ml-1">so'm</span>
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">Har bir imtihon uchun · 7 kun amal qiladi</p>
                                    </div>

                                    <ul className="space-y-3 flex-1 mb-6">
                                        {[
                                            { text: "1 ta to'liq At-Taanal imtihoni", included: true },
                                            { text: "Batafsil natijalar va tahlil", included: true },
                                            { text: "CEFR darajasi aniqlash", included: true },
                                            { text: "7 kun amal qiladi", included: true },
                                            { text: "Obuna talab etilmaydi", included: true },
                                            { text: "Writing/Speaking AI", included: false },
                                            { text: "AI Tutor", included: false },
                                        ].map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm">
                                                {feature.included ? (
                                                    <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                                        <Check className="h-3 w-3 text-blue-600" />
                                                    </div>
                                                ) : (
                                                    <div className="h-5 w-5 rounded-full bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                                                        <X className="h-3 w-3 text-muted-foreground/60" />
                                                    </div>
                                                )}
                                                <span className={feature.included ? "text-foreground" : "text-muted-foreground/60 line-through"}>
                                                    {feature.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {planType === "standard" && status?.purchases.mockExam.available ? (
                                        <Button
                                            className="w-full rounded-xl h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                                            onClick={() => { window.location.href = "/exams"; }}
                                        >
                                            Imtihonni boshlash
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full rounded-xl h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/25"
                                            onClick={() => handleUpgrade("standard")}
                                            disabled={purchaseMock.isPending}
                                        >
                                            {purchaseMock.isPending ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    50,000 so'mga sotib olish
                                                    <ArrowRight className="h-4 w-4 ml-2" />
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    {planType === "standard" && status && (
                                        <div className="mt-3 text-center">
                                            <QuotaIndicator
                                                label="Qolgan urinishlar"
                                                used={0}
                                                limit={status.purchases.mockExam.available}
                                                color="blue"
                                            />
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* PRO PLAN */}
                            <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
                                <div className={`relative flex flex-col h-full rounded-2xl border-2 p-6 transition-all duration-300 ${proCardClass}`}>
                                    {/* Recommended / Current badge */}
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className={`px-4 py-1 rounded-full text-white text-xs font-bold shadow-md ${proBadgeClass}`}>
                                            {planType === "pro" ? "✨ Joriy reja" : "⭐ Tavsiya etiladi"}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                                            <Crown className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground">Pro</h3>
                                            <p className="text-xs text-muted-foreground">Obuna</p>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <p className="text-3xl font-extrabold text-foreground">
                                            89,000
                                            <span className="text-sm font-normal text-muted-foreground ml-1">so'm/oy</span>
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            yoki 119,000 so'm/oy (premium)
                                        </p>
                                    </div>

                                    <ul className="space-y-3 flex-1 mb-6">
                                        {[
                                            "To'liq Sarf platformasi",
                                            "3 ta mock imtihon / oy",
                                            "10 ta Writing AI / oy",
                                            "6 ta Speaking AI / oy",
                                            "50 ta AI Tutor xabar / oy",
                                            "Progress tracking + analytics",
                                            "Avtomatik kvota yangilanishi",
                                        ].map((text, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm">
                                                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Check className="h-3 w-3 text-amber-600" />
                                                </div>
                                                <span className="text-foreground font-medium">{text}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {planType === "pro" ? (
                                        <div className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 text-center text-sm font-semibold text-amber-700 dark:text-amber-400">
                                            <Crown className="h-4 w-4 inline mr-1.5" />
                                            Pro foydalanuvchisiz
                                        </div>
                                    ) : (
                                        <Button
                                            className="w-full rounded-xl h-12 text-base font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25 border-0"
                                            onClick={() => handleUpgrade("pro")}
                                            disabled={subscribePro.isPending}
                                        >
                                            {subscribePro.isPending ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Crown className="h-4 w-4 mr-2" />
                                                    Pro ga o'tish
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* Trust badges */}
                        <motion.div
                            className="flex flex-col items-center gap-3 pt-6"
                            {...fadeUp}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Shield className="h-4 w-4" />
                                <span className="text-sm font-medium">Xavfsiz to'lov</span>
                            </div>
                            <p className="text-center text-sm text-muted-foreground max-w-md">
                                To'lov Click va Payme orqali xavfsiz amalga oshiriladi.
                                Obuna muddati tugagach, Free rejaga avtomatik o'tiladi.
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                                <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00B4E6]/10 text-[#00B4E6]">CLICK</div>
                                <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00CCCC]/10 text-[#00CCCC]">PAYME</div>
                            </div>
                        </motion.div>
                    </>
                )}
            </motion.div>

            {/* Upgrade Modal */}
            <AnimatePresence>
                {showUpgradeModal && (
                    <UpgradeModal
                        target={upgradeTarget}
                        onClose={() => setShowUpgradeModal(false)}
                        onPurchaseMock={() => purchaseMock.mutate()}
                        onSubscribePro={(level) => subscribePro.mutate(level)}
                        isPending={purchaseMock.isPending || subscribePro.isPending}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
