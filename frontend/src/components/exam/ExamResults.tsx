// ─────────────────────────────────────────────────
// Exam Results – O'zbek tilida
// ─────────────────────────────────────────────────

import type { ExamAttempt } from "@/types/exam";
import { getCEFRLevel, extrapolateToFull } from "@/utils/scoring";
import {
    Trophy,
    BookOpen,
    FileText,
    Headphones,
    PenTool,
    Mic,
    ArrowRight,
    RotateCcw,
    BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ExamResultsProps {
    attempt: ExamAttempt;
    onRestart: () => void;
}

export function ExamResults({ attempt, onRestart }: ExamResultsProps) {
    const navigate = useNavigate();
    const grammar = attempt.sections.grammar;
    const reading = attempt.sections.reading;

    const grammarScore = grammar?.score ?? 0;
    const readingRaw = reading?.rawCorrect ?? 0;
    const readingScaled = reading?.score ?? 0;
    const totalPartial = grammarScore + readingScaled;
    const estimated150 = extrapolateToFull(totalPartial, 60);
    const level = getCEFRLevel(estimated150);

    // Level color mapping
    const levelColors: Record<string, string> = {
        "Below A2": "from-gray-500 to-gray-600",
        A2: "from-amber-500 to-orange-500",
        B1: "from-blue-500 to-cyan-500",
        B2: "from-emerald-500 to-teal-500",
        C1: "from-purple-500 to-violet-500",
        C2: "from-yellow-400 to-amber-500",
    };

    const levelBg: Record<string, string> = {
        "Below A2": "bg-gray-500/10 border-gray-500/30",
        A2: "bg-amber-500/10 border-amber-500/30",
        B1: "bg-blue-500/10 border-blue-500/30",
        B2: "bg-emerald-500/10 border-emerald-500/30",
        C1: "bg-purple-500/10 border-purple-500/30",
        C2: "bg-yellow-500/10 border-yellow-500/30",
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
            <div className="max-w-3xl w-full">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
                        <Trophy className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                        Imtihon natijalari
                    </h1>
                    <p className="text-muted-foreground">At-Ta'anul imtihoni</p>
                </div>

                {/* Estimated Level */}
                <div
                    className={`rounded-2xl border-2 p-6 text-center mb-8 ${levelBg[level] ?? "bg-primary/10 border-primary/30"
                        }`}
                >
                    <p className="text-sm text-muted-foreground mb-2">Taxminiy daraja</p>
                    <div
                        className={`text-5xl md:text-6xl font-black bg-gradient-to-r ${levelColors[level] ?? "from-primary to-secondary"
                            } bg-clip-text text-transparent`}
                    >
                        {level}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        ※ Faqat Grammatika va O'qish asosida taxminiy ({totalPartial}/60)
                    </p>
                </div>

                {/* Score Summary */}
                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-lg mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-card-foreground">
                            Batafsil natijalar
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {/* Grammar */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-card-foreground">
                                        Grammatika
                                    </span>
                                    <span className="font-bold text-primary">
                                        {grammarScore} / 30
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000"
                                        style={{ width: `${(grammarScore / 30) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Reading */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                <BookOpen className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-card-foreground">
                                        O'qish
                                    </span>
                                    <span className="font-bold text-blue-500">
                                        {readingRaw}/24 → {readingScaled}/30
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000"
                                        style={{ width: `${(readingScaled / 30) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Listening – coming soon */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border opacity-50">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Headphones className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <span className="font-semibold text-muted-foreground">
                                    Tinglash — tez kunlarda
                                </span>
                            </div>
                            <span className="text-sm text-muted-foreground">-- / 30</span>
                        </div>

                        {/* Writing – coming soon */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border opacity-50">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <PenTool className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <span className="font-semibold text-muted-foreground">
                                    Yozish — tez kunlarda
                                </span>
                            </div>
                            <span className="text-sm text-muted-foreground">-- / 30</span>
                        </div>

                        {/* Speaking – coming soon */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border opacity-50">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Mic className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <span className="font-semibold text-muted-foreground">
                                    Gapirish — tez kunlarda
                                </span>
                            </div>
                            <span className="text-sm text-muted-foreground">-- / 30</span>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                        <span className="text-lg font-bold text-card-foreground">
                            Qisman jami
                        </span>
                        <span className="text-2xl font-black text-primary">
                            {totalPartial} / 60
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        To'liq natija 150 balldan iborat — Tinglash, Yozish va Gapirish qo'shilgandan so'ng
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onRestart}
                        className="flex-1 py-3 px-6 rounded-xl border border-border bg-card/80 text-card-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-all"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Qayta topshirish
                    </button>
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all"
                    >
                        Bosh sahifaga qaytish
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
