// ─────────────────────────────────────────────────
// ListeningRunner – orchestrates all 3 listening stages
// Stage 1: المحادثة القصيرة (short dialogue)
// Stage 2: المحادثة الطويلة / الرواية (long conversation)
// Stage 3: المحاضرة (lecture)
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from "react";
import { ListeningStageRunner } from "./ListeningStageRunner";
import type { ListeningStage, Answer, ListeningStageAttempt } from "@/types/exam";
import { Headphones, ArrowRight, Clock, Volume2, Zap } from "lucide-react";

interface ListeningRunnerProps {
    stages: ListeningStage[];
    onComplete: (stageAttempts: ListeningStageAttempt[]) => void;
    onAnswerChange?: (stageAttempts: ListeningStageAttempt[]) => void;
}

export function ListeningRunner({
    stages,
    onComplete,
    onAnswerChange,
}: ListeningRunnerProps) {
    const [started, setStarted] = useState(false);
    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [stageAttempts, setStageAttempts] = useState<ListeningStageAttempt[]>([]);
    const completedRef = useRef(false);
    const stageAttemptsRef = useRef<ListeningStageAttempt[]>([]);

    useEffect(() => {
        stageAttemptsRef.current = stageAttempts;
    }, [stageAttempts]);

    useEffect(() => {
        onAnswerChange?.(stageAttempts);
    }, [stageAttempts, onAnswerChange]);

    const currentStage = stages[currentStageIndex];
    const isLastStage = currentStageIndex === stages.length - 1;

    // Calculate question offset for global progress
    const questionOffset = stages
        .slice(0, currentStageIndex)
        .reduce((sum, s) => sum + s.questions.length, 0);

    // ── Stage complete ──
    const handleStageComplete = useCallback(
        (answers: Answer[]) => {
            if (completedRef.current) return;

            const score = answers.filter((a) => a.isCorrect === true).length;
            const attempt: ListeningStageAttempt = {
                stageIndex: currentStage.stageIndex,
                answers,
                score,
            };

            const newAttempts = [...stageAttemptsRef.current, attempt];
            setStageAttempts(newAttempts);

            if (isLastStage) {
                completedRef.current = true;
                onComplete(newAttempts);
            } else {
                setCurrentStageIndex((prev) => prev + 1);
            }
        },
        [currentStage, isLastStage, onComplete]
    );

    // ── Answer change for persistence ──
    const handleAnswerChange = useCallback(
        (answers: Answer[]) => {
            // Create a temporary stage attempt for persistence
            const score = answers.filter((a) => a.isCorrect === true).length;
            const tempAttempt: ListeningStageAttempt = {
                stageIndex: currentStage.stageIndex,
                answers,
                score,
            };
            const tempAttempts = [...stageAttemptsRef.current, tempAttempt];
            onAnswerChange?.(tempAttempts);
        },
        [currentStage, onAnswerChange]
    );

    const handleStart = useCallback(() => {
        setStarted(true);
    }, []);

    // ═══════════════ INTRO SCREEN ═══════════════
    if (!started) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5 flex items-center justify-center p-4">
                <div className="max-w-lg w-full">
                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-xl">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                <Headphones className="w-8 h-8 text-emerald-500" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                            3-bo'lim: Tinglash
                        </h2>
                        <p className="text-muted-foreground text-center mb-8">
                            Arab tilida 3 ta audio tinglash va savollarga javob berish
                        </p>

                        {/* Info cards */}
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                <Volume2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">3 ta bosqich</p>
                                    <p className="text-sm text-muted-foreground">
                                        Qisqa dialog, Uzun suhbat, Ma'ruza
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                <Headphones className="w-5 h-5 text-amber-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Savollar soni</p>
                                    <p className="text-sm text-muted-foreground">
                                        Jami 15 ta savol (har bosqichda 5 ta)
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                <Clock className="w-5 h-5 text-blue-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Vaqt</p>
                                    <p className="text-sm text-muted-foreground">
                                        1-bosqich: har savol 1 daqiqa · 2-3 bosqich: jami 7 daqiqa
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                                <Zap className="w-5 h-5 text-red-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Muhim</p>
                                    <p className="text-sm text-muted-foreground">
                                        Har bir audio max 2 marta eshitiladi. Timer audio vaqtida ham ishlaydi.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Rules */}
                        <div className="p-4 rounded-xl bg-muted/50 border border-border mb-8">
                            <p className="text-sm font-semibold text-card-foreground mb-2">Qoidalar:</p>
                            <ul className="text-sm text-muted-foreground space-y-1.5">
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500 mt-0.5">•</span>
                                    Audio avtomatik boshlanadi
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500 mt-0.5">•</span>
                                    "Qayta tinglash" tugmasi bilan 2-marta eshitish mumkin
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500 mt-0.5">•</span>
                                    Timer audio vaqtida ham to'xtamaydi
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500 mt-0.5">•</span>
                                    Vaqt tugasa, javob avtomatik saqlanadi
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={handleStart}
                            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-base flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98]"
                        >
                            Tinglashni boshlash
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════ STAGE RUNNER ═══════════════
    return (
        <ListeningStageRunner
            key={currentStageIndex}
            stage={currentStage}
            stageNumber={currentStageIndex + 1}
            onComplete={handleStageComplete}
            onAnswerChange={handleAnswerChange}
            questionOffset={questionOffset}
        />
    );
}
