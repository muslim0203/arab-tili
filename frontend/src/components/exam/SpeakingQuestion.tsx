// ─────────────────────────────────────────────────
// Speaking Question – Single question component
// Phases: preparation (45s) → recording (120s max)
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from "react";
import { Timer } from "./Timer";
import { AudioRecorder } from "./AudioRecorder";
import { createDeadline } from "@/utils/timer";
import { Clock, Mic, PlayCircle } from "lucide-react";
import type { SpeakingQuestion as SpeakingQuestionType } from "@/types/exam";

interface SpeakingQuestionProps {
    question: SpeakingQuestionType;
    questionNumber: number;
    totalQuestions: number;
    onRecordingComplete: (questionId: string, audioBlob: Blob) => void;
}

type Phase = "preparation" | "recording";

const PREP_TIME_SEC = 45;
const RECORD_TIME_SEC = 120; // 2 minutes max

const difficultyLabels: Record<string, { text: string; color: string; bg: string }> = {
    easy: { text: "Oson", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
    medium: { text: "O'rta", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" },
    hard: { text: "Qiyin", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30" },
};

export function SpeakingQuestion({
    question,
    questionNumber,
    totalQuestions,
    onRecordingComplete,
}: SpeakingQuestionProps) {
    const [phase, setPhase] = useState<Phase>("preparation");
    const [prepDeadline] = useState(() => createDeadline(PREP_TIME_SEC));
    const [recordDeadline, setRecordDeadline] = useState<number | null>(null);
    const prepExpiredRef = useRef(false);

    const diff = difficultyLabels[question.difficulty] ?? difficultyLabels.easy;

    // Auto-transition from preparation to recording
    const handlePrepExpire = useCallback(() => {
        if (prepExpiredRef.current) return;
        prepExpiredRef.current = true;
        setPhase("recording");
        setRecordDeadline(createDeadline(RECORD_TIME_SEC));
    }, []);

    // Can skip prep early
    const handleSkipPrep = useCallback(() => {
        if (phase !== "preparation") return;
        handlePrepExpire();
    }, [phase, handlePrepExpire]);

    // When recording finishes
    const handleRecordDone = useCallback(
        (blob: Blob) => {
            onRecordingComplete(question.id, blob);
        },
        [question.id, onRecordingComplete]
    );

    // When recording timer expires
    const handleRecordExpire = useCallback(() => {
        // AudioRecorder will be told to stop via the expired prop
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-rose-500/5 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full space-y-6">
                {/* Header bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Savol {questionNumber}/{totalQuestions}
                        </span>
                        <span
                            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${diff.bg} ${diff.color}`}
                        >
                            {diff.text}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {phase === "preparation" && (
                            <Timer
                                deadline={prepDeadline}
                                onExpire={handlePrepExpire}
                                size="sm"
                                label="Tayyorgarlik"
                                warnAt={15}
                                dangerAt={5}
                            />
                        )}
                        {phase === "recording" && recordDeadline && (
                            <Timer
                                deadline={recordDeadline}
                                onExpire={handleRecordExpire}
                                size="sm"
                                label="Yozib olish"
                                warnAt={30}
                                dangerAt={10}
                            />
                        )}
                    </div>
                </div>

                {/* Question Card */}
                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-lg">
                    {/* Phase Indicator */}
                    <div className="flex items-center gap-2 mb-6">
                        {phase === "preparation" ? (
                            <>
                                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-amber-400" />
                                </div>
                                <span className="text-sm font-semibold text-amber-400">
                                    Tayyorgarlik bosqichi — savolni o'qing
                                </span>
                            </>
                        ) : (
                            <>
                                <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center animate-pulse">
                                    <Mic className="w-4 h-4 text-rose-400" />
                                </div>
                                <span className="text-sm font-semibold text-rose-400">
                                    Yozib olish — gapiring
                                </span>
                            </>
                        )}
                    </div>

                    {/* Arabic Prompt */}
                    <div
                        className="text-2xl md:text-3xl font-bold leading-relaxed text-card-foreground mb-8"
                        dir="rtl"
                        lang="ar"
                        style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
                    >
                        {question.prompt}
                    </div>

                    {/* Score info */}
                    <p className="text-xs text-muted-foreground">
                        Maksimum ball: {question.maxScore} · Baholash: ravonlik, grammatika, lug'at, talaffuz, izchillik
                    </p>
                </div>

                {/* Action area */}
                {phase === "preparation" && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-sm text-muted-foreground text-center">
                            Tayyorgarlik tugagandan so'ng avtomatik yozib olish boshlanadi
                        </p>
                        <button
                            onClick={handleSkipPrep}
                            className="py-2.5 px-6 rounded-xl border border-border bg-card/80 text-card-foreground font-medium text-sm flex items-center gap-2 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 transition-all"
                        >
                            <PlayCircle className="w-4 h-4" />
                            Hoziroq boshlash
                        </button>
                    </div>
                )}

                {phase === "recording" && recordDeadline && (
                    <AudioRecorder
                        deadline={recordDeadline}
                        onComplete={handleRecordDone}
                    />
                )}
            </div>
        </div>
    );
}
