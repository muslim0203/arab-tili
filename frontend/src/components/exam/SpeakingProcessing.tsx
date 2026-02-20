// ─────────────────────────────────────────────────
// Speaking Processing – sends audio to backend,
// polls for scoring status, shows progress
// ─────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle, Mic } from "lucide-react";
import { api } from "@/lib/api";
import type { SpeakingQuestion, SpeakingAnswer } from "@/types/exam";

interface SpeakingProcessingProps {
    questions: SpeakingQuestion[];
    answers: SpeakingAnswer[];
    onComplete: (scoredAnswers: SpeakingAnswer[]) => void;
}

interface AnalyzeResponse {
    questionId: string;
    score: number;
    feedback: string;
    rubric: {
        fluency: number;
        grammar: number;
        vocabulary: number;
        pronunciation: number;
        coherence: number;
    };
    transcript: string;
}

type ItemStatus = "waiting" | "uploading" | "processing" | "scored" | "error";

interface StatusItem {
    questionId: string;
    status: ItemStatus;
    score: number | null;
    error?: string;
}

export function SpeakingProcessing({ questions, answers, onComplete }: SpeakingProcessingProps) {
    const [statuses, setStatuses] = useState<StatusItem[]>(() =>
        answers.map((a) => ({
            questionId: a.questionId,
            status: "waiting" as ItemStatus,
            score: null,
        }))
    );
    const scoredAnswersRef = useRef<SpeakingAnswer[]>([...answers]);
    const processingStarted = useRef(false);

    const processAll = useCallback(async () => {
        if (processingStarted.current) return;
        processingStarted.current = true;

        const results = [...scoredAnswersRef.current];

        for (let i = 0; i < answers.length; i++) {
            const answer = answers[i];
            const question = questions.find((q) => q.id === answer.questionId);
            if (!question) continue;

            // Update status to uploading
            setStatuses((prev) =>
                prev.map((s) =>
                    s.questionId === answer.questionId
                        ? { ...s, status: "uploading" }
                        : s
                )
            );

            try {
                // Build FormData with audio
                const formData = new FormData();
                if (answer.audioBlob && answer.audioBlob.size > 0) {
                    formData.append("audio", answer.audioBlob, `speaking-${answer.questionId}.webm`);
                }
                formData.append("questionId", answer.questionId);
                formData.append("difficulty", question.difficulty);
                formData.append("prompt", question.prompt);
                formData.append("maxScore", String(question.maxScore));

                // Update to processing
                setStatuses((prev) =>
                    prev.map((s) =>
                        s.questionId === answer.questionId
                            ? { ...s, status: "processing" }
                            : s
                    )
                );

                // Send to backend
                const response = await api<AnalyzeResponse>("/speaking/analyze", {
                    method: "POST",
                    body: formData,
                });

                // Update scored answer
                results[i] = {
                    ...results[i],
                    score: response.score,
                    feedback: response.feedback,
                    transcript: response.transcript,
                    rubric: response.rubric,
                    status: "scored",
                };

                setStatuses((prev) =>
                    prev.map((s) =>
                        s.questionId === answer.questionId
                            ? { ...s, status: "scored", score: response.score }
                            : s
                    )
                );
            } catch (err) {
                console.error(`[Speaking] Error processing ${answer.questionId}:`, err);

                // Fallback: give 0 score
                results[i] = {
                    ...results[i],
                    score: 0,
                    feedback: "Baholashda xatolik yuz berdi.",
                    status: "scored",
                };

                setStatuses((prev) =>
                    prev.map((s) =>
                        s.questionId === answer.questionId
                            ? { ...s, status: "error", score: 0, error: (err as Error).message }
                            : s
                    )
                );
            }
        }

        scoredAnswersRef.current = results;

        // Small delay for UX
        setTimeout(() => {
            onComplete(results);
        }, 1500);
    }, [answers, questions, onComplete]);

    useEffect(() => {
        processAll();
    }, [processAll]);

    const completedCount = statuses.filter((s) => s.status === "scored" || s.status === "error").length;
    const progress = (completedCount / statuses.length) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
            <div className="max-w-lg w-full text-center space-y-8">
                {/* Header */}
                <div>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-orange-500/20 mb-4 animate-pulse">
                        <Mic className="w-8 h-8 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        Natijalar tahlil qilinmoqda...
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        AI javoblaringizni baholamoqda. Iltimos kuting.
                    </p>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-700"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Status list */}
                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
                    {statuses.map((item, i) => {
                        const question = questions.find((q) => q.id === item.questionId);
                        return (
                            <div
                                key={item.questionId}
                                className={`flex items-center gap-4 p-4 ${i < statuses.length - 1 ? "border-b border-border" : ""
                                    }`}
                            >
                                {/* Status icon */}
                                <div className="shrink-0">
                                    {item.status === "waiting" && (
                                        <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/20" />
                                    )}
                                    {(item.status === "uploading" || item.status === "processing") && (
                                        <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
                                    )}
                                    {item.status === "scored" && (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                    )}
                                    {item.status === "error" && (
                                        <XCircle className="w-6 h-6 text-red-400" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 text-left">
                                    <span className="text-sm font-medium text-card-foreground">
                                        Savol {i + 1}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                        ({question?.difficulty === "easy" ? "Oson" : question?.difficulty === "medium" ? "O'rta" : "Qiyin"})
                                    </span>
                                </div>

                                {/* Score */}
                                <div className="shrink-0">
                                    {item.score !== null ? (
                                        <span className="text-sm font-bold text-primary">
                                            {item.score}/5
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            {item.status === "uploading"
                                                ? "Yuklanmoqda..."
                                                : item.status === "processing"
                                                    ? "Tahlil..."
                                                    : "Kutilmoqda"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {completedCount === statuses.length && (
                    <p className="text-sm text-emerald-400 font-medium animate-pulse">
                        Barcha natijalar tayyor! Natijalar sahifasiga yo'naltirilmoqda...
                    </p>
                )}
            </div>
        </div>
    );
}
