// ─────────────────────────────────────────────────
// Speaking & Writing Exam Runner – standalone free exam
// Writing (2 tasks) → Speaking (6 questions) → Results
// Free: 2 attempts per day
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    PenTool,
    Mic,
    ArrowLeft,
    ArrowRight,
    Trophy,
    BarChart3,
    RotateCcw,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
} from "lucide-react";
import { WritingRunner } from "./WritingRunner";
import { SpeakingRunner } from "./SpeakingRunner";
import { writingTasks, speakingQuestions } from "@/data/at-taanal-seed";
import type { WritingSectionResult, SpeakingSectionResult } from "@/types/exam";

// ─── Daily limit logic ───
const DAILY_KEY = "sw-exam-daily";
const MAX_DAILY = 2;

interface DailyRecord {
    date: string; // YYYY-MM-DD
    count: number;
}

function getTodayStr(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getDailyRecord(): DailyRecord {
    try {
        const raw = localStorage.getItem(DAILY_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as DailyRecord;
            if (parsed.date === getTodayStr()) return parsed;
        }
    } catch { /* ignore */ }
    return { date: getTodayStr(), count: 0 };
}

function incrementDaily(): DailyRecord {
    const record = getDailyRecord();
    record.count++;
    record.date = getTodayStr();
    localStorage.setItem(DAILY_KEY, JSON.stringify(record));
    return record;
}

function getRemainingAttempts(): number {
    const record = getDailyRecord();
    return Math.max(0, MAX_DAILY - record.count);
}

// ─── Types ───
type Phase = "intro" | "writing" | "speaking" | "results";

interface SWResult {
    writing: WritingSectionResult | null;
    speaking: SpeakingSectionResult | null;
    totalScore: number;
    maxScore: number;
    completedAt: string;
}

const SW_STORAGE_KEY = "sw-exam-progress";

export function SpeakingWritingExamRunner() {
    const navigate = useNavigate();
    const [phase, setPhase] = useState<Phase>("intro");
    const [result, setResult] = useState<SWResult | null>(null);
    const [remaining, setRemaining] = useState(getRemainingAttempts());
    const writingResultRef = useRef<WritingSectionResult | null>(null);

    // Check for saved progress
    useEffect(() => {
        try {
            const raw = localStorage.getItem(SW_STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved.phase && saved.phase !== "intro") {
                    if (saved.writingResult) writingResultRef.current = saved.writingResult;
                    setPhase(saved.phase);
                }
            }
        } catch { /* ignore */ }
    }, []);

    const saveProgress = useCallback((p: Phase, wr: WritingSectionResult | null = null) => {
        localStorage.setItem(SW_STORAGE_KEY, JSON.stringify({
            phase: p,
            writingResult: wr,
        }));
    }, []);

    // ═══ Start exam ═══
    const handleStart = useCallback(() => {
        if (remaining <= 0) return;
        incrementDaily();
        setRemaining(getRemainingAttempts());
        writingResultRef.current = null;
        setResult(null);
        setPhase("writing");
        saveProgress("writing");
    }, [remaining, saveProgress]);

    // ═══ Writing complete ═══
    const handleWritingComplete = useCallback((writingResult: WritingSectionResult) => {
        writingResultRef.current = writingResult;
        setPhase("speaking");
        saveProgress("speaking", writingResult);
    }, [saveProgress]);

    // ═══ Speaking complete ═══
    const handleSpeakingComplete = useCallback((speakingResult: SpeakingSectionResult) => {
        const wr = writingResultRef.current;
        const totalScore = (wr?.score ?? 0) + speakingResult.score;
        const swResult: SWResult = {
            writing: wr,
            speaking: speakingResult,
            totalScore,
            maxScore: (wr?.maxScore ?? 15) + speakingResult.maxScore,
            completedAt: new Date().toISOString(),
        };
        setResult(swResult);
        setPhase("results");
        localStorage.removeItem(SW_STORAGE_KEY);
    }, []);

    // ═══ Restart ═══
    const handleRestart = useCallback(() => {
        setResult(null);
        writingResultRef.current = null;
        setRemaining(getRemainingAttempts());
        setPhase("intro");
        localStorage.removeItem(SW_STORAGE_KEY);
    }, []);

    // ═══ INTRO ═══
    if (phase === "intro") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full">
                    {/* Back */}
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Orqaga qaytish
                    </button>

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-secondary/20 to-amber-500/20 mb-4">
                            <div className="flex items-center gap-1">
                                <PenTool className="w-6 h-6 text-amber-500" />
                                <Mic className="w-6 h-6 text-secondary" />
                            </div>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                            Gapirish va Yozish imtihoni
                        </h1>
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 text-xs font-semibold bg-secondary/15 text-secondary rounded-full">
                                Bepul
                            </span>
                            <span className="text-muted-foreground text-sm">
                                Kuniga {MAX_DAILY} ta bepul urinish
                            </span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-lg mb-6">
                        <h2 className="font-bold text-card-foreground mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-secondary" />
                            Imtihon tarkibi
                        </h2>

                        <div className="grid sm:grid-cols-2 gap-4 mb-6">
                            {/* Writing section info */}
                            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <PenTool className="w-4 h-4 text-amber-500" />
                                    <span className="font-semibold text-card-foreground text-sm">Yozish</span>
                                </div>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• 1 ta vazifa (tasodifiy)</li>
                                    <li>• 28 daqiqa</li>
                                    <li>• 15 ball</li>
                                    <li>• Arab tilida yozuv</li>
                                </ul>
                            </div>

                            {/* Speaking section info */}
                            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Mic className="w-4 h-4 text-rose-500" />
                                    <span className="font-semibold text-card-foreground text-sm">Gapirish</span>
                                </div>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• 1 ta savol (tasodifiy)</li>
                                    <li>• Tayyorgarlik: 45 soniya</li>
                                    <li>• Yozib olish: 2 daqiqagacha</li>
                                    <li>• 5 ball</li>
                                </ul>
                            </div>
                        </div>

                        {/* Daily limit */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/5 border border-secondary/20">
                            <Clock className="w-5 h-5 text-secondary shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-card-foreground">
                                    Bugungi qolgan urinishlar: <span className={remaining > 0 ? "text-secondary" : "text-red-500"}>{remaining}/{MAX_DAILY}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Har kuni 00:00 da yangilanadi
                                </p>
                            </div>
                        </div>
                    </div>

                    {remaining > 0 ? (
                        <button
                            onClick={handleStart}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-secondary to-secondary/80 text-white font-bold text-base flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-secondary/30 transition-all active:scale-[0.98]"
                        >
                            Imtihonni boshlash
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="text-center space-y-3">
                            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                                <p className="text-sm text-red-400">
                                    Bugungi bepul urinishlar tugadi. Ertaga qayta urinib ko'ring!
                                </p>
                            </div>
                            <button
                                onClick={() => navigate(-1)}
                                className="py-2.5 px-6 rounded-xl border border-border bg-card text-card-foreground font-semibold text-sm hover:bg-muted/50 transition-all"
                            >
                                Orqaga qaytish
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ═══ WRITING PHASE ═══
    if (phase === "writing") {
        return <WritingRunner tasks={writingTasks} onComplete={handleWritingComplete} maxTasks={1} />;
    }

    // ═══ SPEAKING PHASE ═══
    if (phase === "speaking") {
        return <SpeakingRunner questions={speakingQuestions} onComplete={handleSpeakingComplete} maxQuestions={1} />;
    }

    // ═══ RESULTS PHASE ═══
    if (phase === "results" && result) {
        const { writing, speaking, totalScore, maxScore } = result;
        const writingMaxScore = writing?.maxScore ?? 15;
        const speakingMaxScore = speaking?.maxScore ?? 5;
        const writingScore = writing?.score ?? 0;
        const speakingScore = speaking?.score ?? 0;
        const percentage = Math.round((totalScore / maxScore) * 100);

        // Performance label
        let perfLabel = "Yaxshi harakat!";
        let perfColor = "text-amber-400";
        if (percentage >= 80) { perfLabel = "Ajoyib!"; perfColor = "text-emerald-400"; }
        else if (percentage >= 60) { perfLabel = "Yaxshi!"; perfColor = "text-blue-400"; }
        else if (percentage < 40) { perfLabel = "Ko'proq mashq qiling"; perfColor = "text-red-400"; }

        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex items-center justify-center p-4">
                <div className="max-w-3xl w-full">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-secondary/20 to-amber-500/20 mb-4">
                            <Trophy className="w-10 h-10 text-secondary" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                            Natijalar
                        </h1>
                        <p className="text-muted-foreground">Gapirish va Yozish imtihoni</p>
                    </div>

                    {/* Score circle */}
                    <div className="text-center mb-8">
                        <div className={`text-5xl md:text-6xl font-black ${perfColor} mb-1`}>
                            {totalScore}/{maxScore}
                        </div>
                        <p className={`text-lg font-semibold ${perfColor}`}>{perfLabel}</p>
                        <p className="text-xs text-muted-foreground mt-1">({percentage}%)</p>
                    </div>

                    {/* Section breakdown */}
                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-lg mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <BarChart3 className="w-5 h-5 text-secondary" />
                            <h2 className="text-lg font-bold text-card-foreground">
                                Batafsil natijalar
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {/* Writing */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                                    <PenTool className="w-5 h-5 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-card-foreground">Yozish</span>
                                        <span className="font-bold text-amber-500">{writingScore}/{writingMaxScore}</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000"
                                            style={{ width: `${(writingScore / writingMaxScore) * 100}%` }}
                                        />
                                    </div>
                                    {writing && writing.answers.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {writing.answers.map((a, i) => (
                                                <div key={a.taskId} className="p-3 rounded-lg bg-background/50 border border-border">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-semibold text-card-foreground">
                                                            Vazifa {i + 1}
                                                        </span>
                                                        <span className="text-xs font-bold text-amber-500">
                                                            {a.score ?? 0}/15
                                                        </span>
                                                    </div>
                                                    {a.rubric && (
                                                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                            <span>Mazmun: {a.rubric.content}/3</span>
                                                            <span>Tashkil: {a.rubric.organization}/3</span>
                                                            <span>Grammatika: {a.rubric.grammar}/3</span>
                                                            <span>Lug'at: {a.rubric.vocabulary}/3</span>
                                                            <span>Vazifa: {a.rubric.taskAchievement}/3</span>
                                                        </div>
                                                    )}
                                                    {a.feedback && (
                                                        <p className="text-xs text-muted-foreground mt-1 italic">
                                                            {a.feedback}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Speaking */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                                <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                                    <Mic className="w-5 h-5 text-rose-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-card-foreground">Gapirish</span>
                                        <span className="font-bold text-rose-500">{speakingScore}/{speakingMaxScore}</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-1000"
                                            style={{ width: `${(speakingScore / speakingMaxScore) * 100}%` }}
                                        />
                                    </div>
                                    {speaking && speaking.answers.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                            {speaking.answers.map((a, i) => (
                                                <span key={a.questionId}>
                                                    Savol {i + 1}: {a.score ?? 0}/5
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                            <span className="text-lg font-bold text-card-foreground">
                                Jami ball
                            </span>
                            <span className="text-2xl font-black text-secondary">
                                {totalScore} / {maxScore}
                            </span>
                        </div>
                    </div>

                    {/* Remaining info */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/5 border border-secondary/20 mb-6">
                        <AlertTriangle className="w-5 h-5 text-secondary shrink-0" />
                        <p className="text-xs text-muted-foreground">
                            Bugungi qolgan bepul urinishlar: <span className="font-bold text-secondary">{getRemainingAttempts()}/{MAX_DAILY}</span>
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleRestart}
                            className="flex-1 py-3 px-6 rounded-xl border border-border bg-card/80 text-card-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-secondary/5 transition-all"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Qayta topshirish
                        </button>
                        <button
                            onClick={() => navigate("/exams")}
                            className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-secondary to-secondary/80 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-secondary/30 transition-all"
                        >
                            Imtihonlar sahifasi
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
