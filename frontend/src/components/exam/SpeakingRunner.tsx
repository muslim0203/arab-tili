// ─────────────────────────────────────────────────
// Speaking Runner – main orchestrator
// Phase flow: preparation (45s) → recording (120s) → next question
// 6 questions total (2 easy + 2 medium + 2 hard), 5 points each = 30
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
import { SpeakingQuestion as SpeakingQuestionComponent } from "./SpeakingQuestion";
import { SpeakingProcessing } from "./SpeakingProcessing";
import { Mic, Shield, AlertTriangle } from "lucide-react";
import type { SpeakingQuestion, SpeakingAnswer, SpeakingSectionResult } from "@/types/exam";

interface SpeakingRunnerProps {
    questions: SpeakingQuestion[]; // full pool (12)
    onComplete: (result: SpeakingSectionResult) => void;
    onAnswerChange?: (answers: SpeakingAnswer[]) => void;
    maxQuestions?: number; // default 6 (2e+2m+2h); 1 = random single question
}

const STORAGE_KEY = "at-taanal-speaking";

/** Pick N random items from array */
function pickRandom<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        result.push(copy.splice(idx, 1)[0]);
    }
    return result;
}

/** Select questions based on maxQuestions count */
function selectQuestions(pool: SpeakingQuestion[], count: number): SpeakingQuestion[] {
    if (count === 1) {
        // Pick 1 random from any difficulty
        const idx = Math.floor(Math.random() * pool.length);
        return [pool[idx]];
    }
    const easy = pool.filter((q) => q.difficulty === "easy");
    const medium = pool.filter((q) => q.difficulty === "medium");
    const hard = pool.filter((q) => q.difficulty === "hard");
    const selected = [...pickRandom(easy, 2), ...pickRandom(medium, 2), ...pickRandom(hard, 2)];
    // Shuffle
    for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selected[i], selected[j]] = [selected[j], selected[i]];
    }
    return selected;
}

type RunnerPhase = "intro" | "exam" | "processing" | "done";

interface SavedState {
    selectedQuestions: SpeakingQuestion[];
    answers: SpeakingAnswer[];
    currentIndex: number;
}

export function SpeakingRunner({ questions: pool, onComplete, onAnswerChange, maxQuestions = 6 }: SpeakingRunnerProps) {
    const [phase, setPhase] = useState<RunnerPhase>("intro");
    const [selectedQuestions, setSelectedQuestions] = useState<SpeakingQuestion[]>([]);
    const [answers, setAnswers] = useState<SpeakingAnswer[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [micError, setMicError] = useState<string | null>(null);
    const answersRef = useRef<SpeakingAnswer[]>([]);

    // Prevent page close during exam
    useEffect(() => {
        if (phase !== "exam") return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [phase]);

    // Save to localStorage
    useEffect(() => {
        if (phase === "exam" && selectedQuestions.length > 0) {
            const state: SavedState = { selectedQuestions, answers, currentIndex };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    }, [answers, currentIndex, selectedQuestions, phase]);

    // Check mic permission on intro
    const checkMic = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop());
            setMicError(null);
            return true;
        } catch {
            setMicError("Mikrofon ruxsati berilmagan. Brauzer sozlamalaridan mikrofon ruxsatini bering.");
            return false;
        }
    }, []);

    const handleStart = useCallback(async () => {
        const micOk = await checkMic();
        if (!micOk) return;

        const selected = selectQuestions(pool, maxQuestions);
        const initialAnswers: SpeakingAnswer[] = selected.map((q) => ({
            questionId: q.id,
            audioBlob: null,
            audioUrl: null,
            transcript: null,
            score: null,
            feedback: null,
            rubric: null,
            status: "pending",
        }));

        setSelectedQuestions(selected);
        setAnswers(initialAnswers);
        answersRef.current = initialAnswers;
        setCurrentIndex(0);
        setPhase("exam");
    }, [pool, checkMic, maxQuestions]);

    // When recording completes for a question
    const handleRecordingComplete = useCallback(
        (questionId: string, audioBlob: Blob) => {
            setAnswers((prev) => {
                const updated = prev.map((a) =>
                    a.questionId === questionId
                        ? { ...a, audioBlob, status: "recorded" as const }
                        : a
                );
                answersRef.current = updated;
                onAnswerChange?.(updated);
                return updated;
            });

            // Move to next question or finish
            setCurrentIndex((prev) => {
                const nextIdx = prev + 1;
                if (nextIdx >= selectedQuestions.length) {
                    // All questions done — go to processing
                    setTimeout(() => setPhase("processing"), 300);
                }
                return nextIdx;
            });
        },
        [selectedQuestions.length, onAnswerChange]
    );

    // When all AI scoring is done (called from SpeakingProcessing)
    const handleScoringComplete = useCallback(
        (scoredAnswers: SpeakingAnswer[]) => {
            const totalScore = scoredAnswers.reduce((sum, a) => sum + (a.score ?? 0), 0);
            const result: SpeakingSectionResult = {
                answers: scoredAnswers,
                score: totalScore,
                maxScore: maxQuestions * 5,
            };
            localStorage.removeItem(STORAGE_KEY);
            onComplete(result);
        },
        [onComplete]
    );

    // ═══ INTRO SCREEN ═══
    if (phase === "intro") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
                <div className="max-w-lg w-full text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-rose-500/20 to-orange-500/20 mb-6">
                        <Mic className="w-10 h-10 text-rose-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-3">
                        Gapirish bo'limi
                    </h1>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                        {maxQuestions} ta savol · Har biri 5 ball · Jami {maxQuestions * 5} ball
                    </p>

                    <div className="rounded-2xl border border-border bg-card/80 p-6 text-left space-y-4 mb-6">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-sm text-card-foreground">
                                    Har savol uchun jarayon:
                                </p>
                                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                                    <li>1. <strong>Tayyorgarlik</strong> — 45 soniya (savolni o'qing)</li>
                                    <li>2. <strong>Yozib olish</strong> — 2 daqiqagacha (gapiring)</li>
                                    <li>3. AI avtomatik baholaydi</li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-muted-foreground">
                                Mikrofon ruxsati kerak. Tinch muhitda gapiring.
                            </p>
                        </div>
                    </div>

                    {micError && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 mb-4 text-sm text-red-400">
                            {micError}
                            <button
                                onClick={checkMic}
                                className="ml-2 underline font-medium"
                            >
                                Qayta tekshirish
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleStart}
                        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-rose-500/30 transition-all active:scale-[0.98]"
                    >
                        <Mic className="w-5 h-5" />
                        Boshlash
                    </button>
                </div>
            </div>
        );
    }

    // ═══ EXAM PHASE ═══
    if (phase === "exam" && currentIndex < selectedQuestions.length) {
        const question = selectedQuestions[currentIndex];
        return (
            <SpeakingQuestionComponent
                key={question.id}
                question={question}
                questionNumber={currentIndex + 1}
                totalQuestions={selectedQuestions.length}
                onRecordingComplete={handleRecordingComplete}
            />
        );
    }

    // ═══ PROCESSING PHASE ═══
    if (phase === "processing") {
        return (
            <SpeakingProcessing
                questions={selectedQuestions}
                answers={answersRef.current}
                onComplete={handleScoringComplete}
            />
        );
    }

    return null;
}
