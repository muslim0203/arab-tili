import { useState } from "react";
import { motion } from "framer-motion";
import { X, Crown, Zap, Loader2, ShieldCheck, Wallet, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

type UpgradeModalProps = {
    target: "standard" | "pro";
    onClose: () => void;
    onPurchaseMock: (provider: "click" | "payme") => void;
    onSubscribePro: (level: "basic" | "premium", provider: "click" | "payme") => void;
    isPending: boolean;
};

export function UpgradeModal({
    target,
    onClose,
    onPurchaseMock,
    onSubscribePro,
    isPending,
}: UpgradeModalProps) {
    const [provider, setProvider] = useState<"click" | "payme">("click");

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            />

            {/* Modal */}
            <motion.div
                className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors z-10"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </button>

                {target === "standard" ? (
                    <>
                        {/* Standard Purchase Flow */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 pb-8">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Zap className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Mock imtihon sotib olish</h2>
                                    <p className="text-blue-100 text-sm">Bir martalik to'lov</p>
                                </div>
                            </div>
                        </div>

                        {/* Provider Selector inside the Modal */}
                        <div className="bg-muted/30 p-4 border-b border-border flex justify-center gap-2">
                            <button
                                onClick={() => setProvider("click")}
                                className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${provider === "click" ? "bg-[#00B4E6] text-white shadow-md shadow-[#00B4E6]/25" : "text-muted-foreground hover:text-foreground hover:bg-background/80 border border-transparent hover:border-border"}`}
                            >
                                <CreditCard className="h-4 w-4" />
                                Click
                            </button>
                            <button
                                onClick={() => setProvider("payme")}
                                className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${provider === "payme" ? "bg-[#00CCCC] text-white shadow-md shadow-[#00CCCC]/25" : "text-muted-foreground hover:text-foreground hover:bg-background/80 border border-transparent hover:border-border"}`}
                            >
                                <Wallet className="h-4 w-4" />
                                Payme
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="flex items-baseline justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Narxi</p>
                                    <p className="text-3xl font-extrabold text-foreground">
                                        50,000 <span className="text-sm font-normal text-muted-foreground">so'm</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Amal muddati</p>
                                    <p className="text-lg font-bold text-foreground">7 kun</p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-4 space-y-2">
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Nimalar kiradi:</p>
                                <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1.5">
                                    <li>✓ 1 ta to'liq At-Taanal CEFR imtihoni</li>
                                    <li>✓ Grammar, Reading, Listening, Writing, Speaking</li>
                                    <li>✓ Batafsil AI natijalar va CEFR darajasi</li>
                                </ul>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <ShieldCheck className="h-4 w-4" />
                                <span>To'lov muvaffaqiyat bilan simulyatsiya qilinadi</span>
                            </div>

                            <Button
                                className="w-full rounded-xl h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all hover:shadow-lg hover:shadow-blue-600/25"
                                onClick={() => onPurchaseMock(provider)}
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    "Hozir sotib olish"
                                )}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Pro Subscription Flow */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 pb-8">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Crown className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Pro obunaga o'tish</h2>
                                    <p className="text-amber-100 text-sm">Oylik obuna</p>
                                </div>
                            </div>
                        </div>

                        {/* Provider Selector inside the Modal */}
                        <div className="bg-muted/30 p-4 border-b border-border flex justify-center gap-2">
                            <button
                                onClick={() => setProvider("click")}
                                className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${provider === "click" ? "bg-[#00B4E6] text-white shadow-md shadow-[#00B4E6]/25" : "text-muted-foreground hover:text-foreground hover:bg-background/80 border border-transparent hover:border-border"}`}
                            >
                                <CreditCard className="h-4 w-4" />
                                Click
                            </button>
                            <button
                                onClick={() => setProvider("payme")}
                                className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${provider === "payme" ? "bg-[#00CCCC] text-white shadow-md shadow-[#00CCCC]/25" : "text-muted-foreground hover:text-foreground hover:bg-background/80 border border-transparent hover:border-border"}`}
                            >
                                <Wallet className="h-4 w-4" />
                                Payme
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Price options */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onSubscribePro("basic", provider)}
                                    disabled={isPending}
                                    className="rounded-xl border-2 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 p-4 text-left transition-all hover:shadow-md group disabled:opacity-50"
                                >
                                    <p className="text-xs text-muted-foreground mb-1">Asosiy</p>
                                    <p className="text-2xl font-extrabold text-foreground">
                                        89,000
                                    </p>
                                    <p className="text-xs text-muted-foreground">so'm/oy</p>
                                    {isPending && (
                                        <Loader2 className="h-4 w-4 animate-spin text-amber-500 mt-2" />
                                    )}
                                </button>
                                <button
                                    onClick={() => onSubscribePro("premium", provider)}
                                    disabled={isPending}
                                    className="rounded-xl border-2 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 p-4 text-left transition-all hover:shadow-md relative overflow-hidden disabled:opacity-50"
                                >
                                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-bl-lg">
                                        PREMIUM
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-1">Premium</p>
                                    <p className="text-2xl font-extrabold text-foreground">
                                        119,000
                                    </p>
                                    <p className="text-xs text-muted-foreground">so'm/oy</p>
                                    {isPending && (
                                        <Loader2 className="h-4 w-4 animate-spin text-orange-500 mt-2" />
                                    )}
                                </button>
                            </div>

                            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Pro afzalliklari:</p>
                                <ul className="text-sm text-amber-600 dark:text-amber-300 space-y-1.5">
                                    <li>✓ To'liq Sarf platformasi</li>
                                    <li>✓ 3 ta mock imtihon / oy</li>
                                    <li>✓ 10 ta Writing AI baholash / oy</li>
                                    <li>✓ 6 ta Speaking AI baholash / oy</li>
                                    <li>✓ 50 ta AI Tutor xabar / oy</li>
                                    <li>✓ Progress tracking + analytics</li>
                                </ul>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <ShieldCheck className="h-4 w-4" />
                                <span>30 kunlik obuna · Istalgan vaqtda bekor qilish mumkin</span>
                            </div>
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}
