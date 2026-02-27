// ─────────────────────────────────────────────────
// ListeningStageRunner – handles one listening stage
// Stage 1: per-question timer (60s), audio resets per question
// Stages 2 & 3: total timer (420s), audio shared across all questions
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from "react";
import { Timer } from "./Timer";
import { createDeadline } from "@/utils/timer";
import type { ListeningStage, Answer } from "@/types/exam";
import {
    CheckCircle2,
    Headphones,
    Volume2,
    RotateCcw,
    ArrowRight,
    Loader2,
    Pause,
} from "lucide-react";

interface ListeningStageRunnerProps {
    stage: ListeningStage;
    stageNumber: number;
    /** Called with all answers when this stage completes */
    onComplete: (answers: Answer[]) => void;
    /** Called on each answer change for persistence */
    onAnswerChange?: (answers: Answer[]) => void;
    /** Global question offset for "Listening X / 15" */
    questionOffset: number;
}

type StagePhase = "ready" | "first_listen" | "answering";

export function ListeningStageRunner({
    stage,
    stageNumber,
    onComplete,
    onAnswerChange,
    questionOffset,
}: ListeningStageRunnerProps) {
    // ── State ──
    const [phase, setPhase] = useState<StagePhase>("ready");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [deadline, setDeadline] = useState(0);
    const [playsUsed, setPlaysUsed] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioError, setAudioError] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const completedRef = useRef(false);
    const answersRef = useRef<Answer[]>([]);
    // Refs to avoid stale closures in audio event listeners
    const phaseRef = useRef<StagePhase>("ready");
    const isPerQuestionRef = useRef(stage.timeMode === "per_question");

    const isPerQuestion = stage.timeMode === "per_question";
    const question = stage.questions[currentIndex];
    const isLastQuestion = currentIndex === stage.questions.length - 1;
    const totalQuestions = stage.questions.length;
    const optionLabels = ["A", "B", "C", "D"];

    // Keep answers ref in sync
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    // Keep phase ref in sync
    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    // Keep isPerQuestion ref in sync
    useEffect(() => {
        isPerQuestionRef.current = isPerQuestion;
    }, [isPerQuestion]);

    // Notify parent on answer change
    useEffect(() => {
        onAnswerChange?.(answers);
    }, [answers, onAnswerChange]);

    // ── Audio URL helper: per-question URL takes priority ──
    const getAudioUrl = useCallback((questionIndex: number): string => {
        const q = stage.questions[questionIndex];
        // Per-question audioUrl (from DB) takes priority over stage-level audioUrl
        const url = q?.audioUrl || stage.audioUrl || "";
        // If relative URL (/api/uploads/...), prefix with backend origin
        if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
            // VITE_API_URL = "https://backend-xxx.vercel.app/api" → origin = "https://backend-xxx.vercel.app"
            const apiBase = import.meta.env.VITE_API_URL || "";
            let backendOrigin = "";
            if (apiBase && apiBase.startsWith("http")) {
                try {
                    backendOrigin = new URL(apiBase).origin;
                } catch {
                    backendOrigin = "";
                }
            }
            if (!backendOrigin) {
                backendOrigin = "http://localhost:3001";
            }
            return `${backendOrigin}${url.startsWith("/") ? "" : "/"}${url}`;
        }
        return url;
    }, [stage.questions, stage.audioUrl]);

    // ── Audio Management ──
    const createAudio = useCallback((audioUrl: string) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.removeAttribute("src");
            audioRef.current.load();
        }
        const audio = new Audio(audioUrl);
        audio.preload = "auto";
        audioRef.current = audio;

        audio.addEventListener("ended", () => {
            setIsPlaying(false);
        });

        // Use refs to read current phase/isPerQuestion — avoids stale closure bug
        audio.addEventListener("error", () => {
            setAudioError(true);
            setIsPlaying(false);
            // If audio fails to load, immediately skip to answering phase
            if (phaseRef.current === "first_listen" || phaseRef.current === "ready") {
                if (isPerQuestionRef.current) {
                    setDeadline(createDeadline(stage.perQuestionTimeSec ?? 60));
                } else {
                    setDeadline(createDeadline(stage.totalTimeSec ?? 420));
                }
                setPhase("answering");
            }
        });

        return audio;
    }, [stage.perQuestionTimeSec, stage.totalTimeSec]);


    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeAttribute("src");
                audioRef.current.load();
                audioRef.current = null;
            }
        };
    }, []);

    // ── Begin stage: create audio + auto-play first listen ──
    const handleBeginStage = useCallback(() => {
        const url = getAudioUrl(0);
        setPhase("first_listen");

        if (!url) {
            // No audio: skip straight to answering
            if (isPerQuestion) {
                setDeadline(createDeadline(stage.perQuestionTimeSec ?? 60));
            } else {
                setDeadline(createDeadline(stage.totalTimeSec ?? 420));
            }
            setAudioError(true);
            setPhase("answering");
            return;
        }

        const audio = createAudio(url);

        // Auto-play first listen
        audio.addEventListener(
            "canplaythrough",
            () => {
                audio.currentTime = 0;
                audio.play().catch(() => {
                    setAudioError(true);
                    setIsPlaying(false);
                    // If autoplay fails, just go to answering mode
                    if (isPerQuestion) {
                        setDeadline(createDeadline(stage.perQuestionTimeSec ?? 60));
                    } else {
                        setDeadline(createDeadline(stage.totalTimeSec ?? 420));
                    }
                    setPhase("answering");
                });
                setIsPlaying(true);
                setPlaysUsed(1);
            },
            { once: true }
        );

        // When first listen ends, start timer
        audio.addEventListener(
            "ended",
            () => {
                setIsPlaying(false);
                if (isPerQuestion) {
                    setDeadline(createDeadline(stage.perQuestionTimeSec ?? 60));
                } else {
                    setDeadline(createDeadline(stage.totalTimeSec ?? 420));
                }
                setPhase("answering");
            },
            { once: true }
        );

        // Also handle case where audio can already play
        if (audio.readyState >= 4) {
            audio.currentTime = 0;
            audio.play().catch(() => {
                // fallback
                setAudioError(true);
                if (isPerQuestion) {
                    setDeadline(createDeadline(stage.perQuestionTimeSec ?? 60));
                } else {
                    setDeadline(createDeadline(stage.totalTimeSec ?? 420));
                }
                setPhase("answering");
            });
            setIsPlaying(true);
            setPlaysUsed(1);
        }
    }, [createAudio, getAudioUrl, isPerQuestion, stage.perQuestionTimeSec, stage.totalTimeSec]);


    // ── Listen Again ──
    const handleListenAgain = useCallback(() => {
        if (playsUsed >= stage.maxPlays) return;
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        audio.play().catch(() => {
            setAudioError(true);
        });
        setIsPlaying(true);
        setPlaysUsed((p) => p + 1);
    }, [playsUsed, stage.maxPlays]);

    // ── Save answer + go next ──
    const saveAndGoNext = useCallback(() => {
        if (completedRef.current) return;

        const answer: Answer = {
            questionId: question.id,
            selectedIndex: selectedOption,
            isCorrect:
                selectedOption !== null
                    ? selectedOption === question.correctIndex
                    : null,
        };

        const newAnswers = [...answersRef.current, answer];
        setAnswers(newAnswers);

        if (isLastQuestion) {
            completedRef.current = true;
            // Stop audio
            if (audioRef.current) {
                audioRef.current.pause();
            }
            onComplete(newAnswers);
        } else {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setSelectedOption(null);

            if (isPerQuestion) {
                // Reset plays and audio for next question
                setPlaysUsed(0);
                setIsPlaying(false);
                setAudioError(false);

                // For stage 1: each question gets its own audio (per-question URL)
                const nextUrl = getAudioUrl(nextIndex);

                if (!nextUrl) {
                    // No audio for this question
                    setAudioError(true);
                    setDeadline(createDeadline(stage.perQuestionTimeSec ?? 60));
                    setPhase("answering");
                    return;
                }

                setPhase("first_listen");
                const audio = createAudio(nextUrl);

                audio.addEventListener(
                    "canplaythrough",
                    () => {
                        audio.currentTime = 0;
                        audio.play().catch(() => {
                            setAudioError(true);
                            setDeadline(createDeadline(stage.perQuestionTimeSec ?? 60));
                            setPhase("answering");
                        });
                        setIsPlaying(true);
                        setPlaysUsed(1);
                    },
                    { once: true }
                );

                audio.addEventListener(
                    "ended",
                    () => {
                        setIsPlaying(false);
                        setDeadline(createDeadline(stage.perQuestionTimeSec ?? 60));
                        setPhase("answering");
                    },
                    { once: true }
                );

                if (audio.readyState >= 4) {
                    audio.currentTime = 0;
                    audio.play().catch(() => {
                        setAudioError(true);
                        setDeadline(createDeadline(stage.perQuestionTimeSec ?? 60));
                        setPhase("answering");
                    });
                    setIsPlaying(true);
                    setPlaysUsed(1);
                }
            }
            // For total mode (stages 2&3), timer continues — no reset
        }
    }, [
        question,
        selectedOption,
        isLastQuestion,
        currentIndex,
        onComplete,
        isPerQuestion,
        createAudio,
        getAudioUrl,
        stage.perQuestionTimeSec,
    ]);


    // ── Timer expired ──
    const handleTimerExpire = useCallback(() => {
        if (completedRef.current) return;

        if (isPerQuestion) {
            // Just save current question and go next
            saveAndGoNext();
        } else {
            // Total mode: save all remaining unanswered questions
            const remainingAnswers: Answer[] = [];
            // Save current question
            remainingAnswers.push({
                questionId: question.id,
                selectedIndex: selectedOption,
                isCorrect:
                    selectedOption !== null
                        ? selectedOption === question.correctIndex
                        : null,
            });
            // Save remaining future questions as null
            for (let i = currentIndex + 1; i < totalQuestions; i++) {
                remainingAnswers.push({
                    questionId: stage.questions[i].id,
                    selectedIndex: null,
                    isCorrect: null,
                });
            }
            const allAnswers = [...answersRef.current, ...remainingAnswers];
            completedRef.current = true;
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setAnswers(allAnswers);
            onComplete(allAnswers);
        }
    }, [
        isPerQuestion,
        saveAndGoNext,
        question,
        selectedOption,
        currentIndex,
        totalQuestions,
        stage.questions,
        onComplete,
    ]);

    // ═══════════════ READY SCREEN ═══════════════
    if (phase === "ready") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5 flex items-center justify-center p-4">
                <div className="max-w-lg w-full">
                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-xl">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                <Headphones className="w-8 h-8 text-emerald-500" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                            {stageNumber}-bosqich: Tinglash
                        </h2>
                        <p
                            className="text-xl font-semibold text-emerald-600 text-center mb-2"
                            dir="rtl"
                        >
                            {stage.title}
                        </p>
                        <p className="text-muted-foreground text-center mb-8">
                            {stage.type === "short_dialogue"
                                ? "Qisqa dialog – erkak va ayol o'rtasidagi suhbat"
                                : stage.type === "long_conversation"
                                    ? "Uzun suhbat / hikoya"
                                    : "Ma'ruza"}
                        </p>

                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                <Volume2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Audio</p>
                                    <p className="text-sm text-muted-foreground">
                                        {isPerQuestion
                                            ? "Har bir savolda audio 2 marta eshitiladi"
                                            : "Audio jami 2 marta eshitiladi (barcha savollar uchun)"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                <Headphones className="w-5 h-5 text-amber-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Savollar</p>
                                    <p className="text-sm text-muted-foreground">
                                        {totalQuestions} ta savol (A, B, C, D)
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                <Loader2 className="w-5 h-5 text-blue-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Vaqt</p>
                                    <p className="text-sm text-muted-foreground">
                                        {isPerQuestion
                                            ? `Har bir savol uchun ${stage.perQuestionTimeSec ?? 60} soniya`
                                            : `Jami ${Math.floor((stage.totalTimeSec ?? 420) / 60)} daqiqa (barcha savollar uchun)`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleBeginStage}
                            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-base flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98]"
                        >
                            <Volume2 className="w-5 h-5" />
                            Tinglashni boshlash
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════ FIRST LISTEN (audio playing, no questions yet) ═══════════════
    if (phase === "first_listen") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5 flex items-center justify-center p-4">
                <div className="max-w-lg w-full">
                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-xl text-center">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center animate-pulse">
                                <Volume2 className="w-10 h-10 text-emerald-500" />
                            </div>
                        </div>

                        <p
                            className="text-xl font-bold text-emerald-600 mb-2"
                            dir="rtl"
                        >
                            {stage.title}
                        </p>
                        <h3 className="text-lg font-semibold text-card-foreground mb-4">
                            Audio tinglanyapti...
                        </h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            Diqqat bilan tinglang. Audio tugagach savollar paydo bo'ladi.
                        </p>

                        {/* Visual audio wave animation */}
                        <div className="flex items-end justify-center gap-1 h-12">
                            {Array.from({ length: 20 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1.5 bg-emerald-500/70 rounded-full"
                                    style={{
                                        height: `${Math.random() * 100}%`,
                                        animation: `audioWave 0.8s ease-in-out ${i * 0.05}s infinite alternate`,
                                        minHeight: "4px",
                                    }}
                                />
                            ))}
                        </div>

                        {audioError && (
                            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                                Audio yuklanmadi. Savollar avtomatik ko'rsatiladi.
                            </div>
                        )}
                    </div>
                </div>
                <style>{`
                    @keyframes audioWave {
                        0% { height: 15%; }
                        100% { height: 85%; }
                    }
                `}</style>
            </div>
        );
    }

    // ═══════════════ ANSWERING PHASE ═══════════════
    const canListenAgain = playsUsed < stage.maxPlays && !isPlaying;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm font-bold">
                            Tinglash
                        </div>
                        <span className="text-sm text-muted-foreground" dir="rtl">
                            {stage.title}
                        </span>
                    </div>
                    <Timer
                        key={isPerQuestion ? `${deadline}-${currentIndex}` : deadline}
                        deadline={deadline}
                        onExpire={handleTimerExpire}
                        size="md"
                        warnAt={isPerQuestion ? 15 : 60}
                        dangerAt={isPerQuestion ? 5 : 15}
                        label={isPerQuestion ? "Savol vaqti" : "Jami vaqt"}
                    />
                </div>

                {/* Progress info */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>
                        Bosqich {stageNumber}: Savol {currentIndex + 1} / {totalQuestions}
                    </span>
                    <span>
                        Tinglash: {questionOffset + currentIndex + 1} / 15
                    </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-muted mb-6 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out"
                        style={{
                            width: `${((questionOffset + currentIndex + 1) / 15) * 100}%`,
                        }}
                    />
                </div>

                {/* Audio Controls */}
                <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    {isPlaying ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                            <div className="flex items-end gap-0.5 h-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="w-1 bg-emerald-500 rounded-full animate-pulse"
                                        style={{
                                            height: `${40 + i * 15}%`,
                                            animationDelay: `${i * 0.15}s`,
                                        }}
                                    />
                                ))}
                            </div>
                            <span className="text-sm font-medium">Tinglanyapti...</span>
                            <button
                                onClick={() => {
                                    audioRef.current?.pause();
                                    setIsPlaying(false);
                                }}
                                className="ml-auto p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                            >
                                <Pause className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 flex-1">
                            <Headphones className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-sm text-muted-foreground">
                                {isPerQuestion
                                    ? `Tinglash: ${playsUsed} / ${stage.maxPlays}`
                                    : `Audio: ${playsUsed} / ${stage.maxPlays} tinglash ishlatildi`}
                            </span>
                            {canListenAgain && (
                                <button
                                    onClick={handleListenAgain}
                                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Qayta tinglash
                                </button>
                            )}
                            {playsUsed >= stage.maxPlays && (
                                <span className="ml-auto text-xs text-muted-foreground">
                                    Tinglash tugadi
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Question Card */}
                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-lg">
                    <p
                        className="text-xl md:text-2xl font-semibold text-card-foreground mb-8 leading-relaxed"
                        dir="rtl"
                    >
                        {question.prompt}
                    </p>

                    <div className="space-y-3" dir="rtl">
                        {question.options.map((option, idx) => {
                            const isSelected = selectedOption === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedOption(idx)}
                                    className={`
                                        w-full text-right p-4 rounded-xl border-2 transition-all duration-200
                                        flex items-center gap-4 group
                                        ${isSelected
                                            ? "border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10"
                                            : "border-border hover:border-emerald-500/40 hover:bg-emerald-500/5"
                                        }
                                    `}
                                >
                                    <span
                                        className={`
                                            w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0
                                            transition-all duration-200
                                            ${isSelected
                                                ? "bg-emerald-500 text-white"
                                                : "bg-muted text-muted-foreground group-hover:bg-emerald-500/20 group-hover:text-emerald-600"
                                            }
                                        `}
                                    >
                                        {optionLabels[idx]}
                                    </span>
                                    <span className="text-base md:text-lg font-medium flex-1">
                                        {option}
                                    </span>
                                    {isSelected && (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={saveAndGoNext}
                            disabled={selectedOption === null}
                            className={`
                                px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                                flex items-center gap-2
                                ${selectedOption !== null
                                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.98]"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                                }
                            `}
                        >
                            {isLastQuestion ? "Bosqichni yakunlash" : "Keyingisi"}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
