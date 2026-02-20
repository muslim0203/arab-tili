// ─────────────────────────────────────────────────
// Writing Processing – sends texts to backend AI,
// shows per-task progress, collects scores
// ─────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle, PenTool } from "lucide-react";
import { api } from "@/lib/api";
import type { WritingTask, WritingAnswer, WritingRubric } from "@/types/exam";

interface WritingProcessingProps {
    tasks: WritingTask[];
    answers: WritingAnswer[];
    onComplete: (scoredAnswers: WritingAnswer[]) => void;
}

interface AnalyzeResponse {
    taskId: string;
    score: number;
    content: number;
    organization: number;
    grammar: number;
    vocabulary: number;
    taskAchievement: number;
    feedback: string;
}

type ItemStatus = "waiting" | "uploading" | "processing" | "scored" | "error";

interface StatusItem {
    taskId: string;
    status: ItemStatus;
    score: number | null;
    error?: string;
}

export function WritingProcessing({ tasks, answers, onComplete }: WritingProcessingProps) {
    const [statuses, setStatuses] = useState<StatusItem[]>(() =>
        answers.map((a) => ({
            taskId: a.taskId,
            status: "waiting" as ItemStatus,
            score: null,
        }))
    );
    const scoredAnswersRef = useRef<WritingAnswer[]>([...answers]);
    const processingStarted = useRef(false);

    const processAll = useCallback(async () => {
        if (processingStarted.current) return;
        processingStarted.current = true;

        const results = [...scoredAnswersRef.current];

        for (let i = 0; i < answers.length; i++) {
            const answer = answers[i];
            const task = tasks.find((t) => t.id === answer.taskId);
            if (!task) continue;

            // Update status to processing
            setStatuses((prev) =>
                prev.map((s) =>
                    s.taskId === answer.taskId
                        ? { ...s, status: "processing" }
                        : s
                )
            );

            try {
                const response = await api<AnalyzeResponse>("/writing/analyze", {
                    method: "POST",
                    body: {
                        taskId: answer.taskId,
                        difficulty: task.difficulty,
                        prompt: task.prompt,
                        text: answer.text,
                        maxScore: task.maxScore,
                    },
                });

                const rubric: WritingRubric = {
                    content: response.content,
                    organization: response.organization,
                    grammar: response.grammar,
                    vocabulary: response.vocabulary,
                    taskAchievement: response.taskAchievement,
                };

                results[i] = {
                    ...results[i],
                    score: response.score,
                    feedback: response.feedback,
                    rubric,
                    status: "scored",
                };

                setStatuses((prev) =>
                    prev.map((s) =>
                        s.taskId === answer.taskId
                            ? { ...s, status: "scored", score: response.score }
                            : s
                    )
                );
            } catch (err) {
                console.error(`[Writing] Error processing ${answer.taskId}:`, err);

                results[i] = {
                    ...results[i],
                    score: 0,
                    feedback: "Baholashda xatolik yuz berdi.",
                    status: "scored",
                };

                setStatuses((prev) =>
                    prev.map((s) =>
                        s.taskId === answer.taskId
                            ? { ...s, status: "error", score: 0, error: (err as Error).message }
                            : s
                    )
                );
            }
        }

        scoredAnswersRef.current = results;

        // UX delay before completing
        setTimeout(() => {
            onComplete(results);
        }, 1500);
    }, [answers, tasks, onComplete]);

    useEffect(() => {
        processAll();
    }, [processAll]);

    const completedCount = statuses.filter((s) => s.status === "scored" || s.status === "error").length;
    const progress = (completedCount / statuses.length) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5 flex items-center justify-center p-4">
            <div className="max-w-lg w-full text-center space-y-8">
                {/* Header */}
                <div>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-4 animate-pulse">
                        <PenTool className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        Yozuvlar tahlil qilinmoqda...
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        AI matnlaringizni baholamoqda. Iltimos kuting.
                    </p>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Status list */}
                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
                    {statuses.map((item, i) => {
                        const task = tasks.find((t) => t.id === item.taskId);
                        return (
                            <div
                                key={item.taskId}
                                className={`flex items-center gap-4 p-4 ${i < statuses.length - 1 ? "border-b border-border" : ""
                                    }`}
                            >
                                {/* Status icon */}
                                <div className="shrink-0">
                                    {item.status === "waiting" && (
                                        <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/20" />
                                    )}
                                    {item.status === "processing" && (
                                        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
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
                                        Vazifa {i + 1}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                        ({task?.difficulty === "easy" ? "Oson" : "Qiyin"})
                                    </span>
                                </div>

                                {/* Score */}
                                <div className="shrink-0">
                                    {item.score !== null ? (
                                        <span className="text-sm font-bold text-primary">
                                            {item.score}/15
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            {item.status === "processing"
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
                        Barcha natijalar tayyor!
                    </p>
                )}
            </div>
        </div>
    );
}
