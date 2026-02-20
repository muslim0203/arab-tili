// ─────────────────────────────────────────────────
// Writing Runner – main orchestrator for Writing section
// Phases: intro → task1 → task2 → processing → done
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
import { PenTool, Keyboard, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { WritingTaskComponent } from "./WritingTaskComponent";
import { WritingProcessing } from "./WritingProcessing";
import type { WritingTask, WritingAnswer, WritingSectionResult } from "@/types/exam";

interface WritingRunnerProps {
    tasks: WritingTask[];
    onComplete: (result: WritingSectionResult) => void;
    maxTasks?: number; // default 2 (1 easy + 1 hard); 1 = random single task
}

type RunnerPhase = "intro" | "exam" | "processing";

const STORAGE_KEY = "at-taanal-writing";

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function WritingRunner({ tasks: pool, onComplete, maxTasks = 2 }: WritingRunnerProps) {
    const [phase, setPhase] = useState<RunnerPhase>("intro");
    const [selectedTasks, setSelectedTasks] = useState<WritingTask[]>([]);
    const [answers, setAnswers] = useState<WritingAnswer[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const answersRef = useRef<WritingAnswer[]>([]);

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

    // Load saved state
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved.selectedTasks?.length && saved.answers?.length) {
                    setSelectedTasks(saved.selectedTasks);
                    setAnswers(saved.answers);
                    answersRef.current = saved.answers;
                    setCurrentIndex(saved.currentIndex ?? 0);
                    setPhase("exam");
                }
            }
        } catch { /* ignore */ }
    }, []);

    // Save state
    const saveState = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            selectedTasks,
            answers: answersRef.current,
            currentIndex,
        }));
    }, [selectedTasks, currentIndex]);

    // Select tasks based on maxTasks
    const handleStart = useCallback(() => {
        const easyPool = shuffleArray(pool.filter((t) => t.difficulty === "easy"));
        const hardPool = shuffleArray(pool.filter((t) => t.difficulty === "hard"));
        let selected: WritingTask[];
        if (maxTasks === 1) {
            // Pick 1 random (easy or hard)
            const all = shuffleArray([...easyPool, ...hardPool]);
            selected = [all[0]].filter(Boolean);
        } else {
            selected = [easyPool[0], hardPool[0]].filter(Boolean);
        }

        const initialAnswers: WritingAnswer[] = selected.map((t) => ({
            taskId: t.id,
            text: "",
            wordCount: 0,
            score: null,
            feedback: null,
            rubric: null,
            status: "pending" as const,
        }));

        setSelectedTasks(selected);
        setAnswers(initialAnswers);
        answersRef.current = initialAnswers;
        setPhase("exam");

        // Save
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            selectedTasks: selected,
            answers: initialAnswers,
            currentIndex: 0,
        }));
    }, [pool, maxTasks]);

    // Task text updated
    const handleTextChange = useCallback((taskId: string, text: string, wordCount: number) => {
        setAnswers((prev) => {
            const updated = prev.map((a) =>
                a.taskId === taskId ? { ...a, text, wordCount } : a
            );
            answersRef.current = updated;
            return updated;
        });
    }, []);

    // Task completed (either "Next" or timer expired)
    const handleTaskComplete = useCallback((taskId: string, text: string, wordCount: number) => {
        // Save final text
        setAnswers((prev) => {
            const updated = prev.map((a) =>
                a.taskId === taskId ? { ...a, text, wordCount } : a
            );
            answersRef.current = updated;
            return updated;
        });

        const nextIdx = currentIndex + 1;
        if (nextIdx < selectedTasks.length) {
            setCurrentIndex(nextIdx);
            // Save updated state
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                selectedTasks,
                answers: answersRef.current,
                currentIndex: nextIdx,
            }));
        } else {
            // All tasks done → go to processing
            setPhase("processing");
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [currentIndex, selectedTasks, saveState]);

    // Processing complete
    const handleProcessingComplete = useCallback((scoredAnswers: WritingAnswer[]) => {
        const totalScore = scoredAnswers.reduce((sum, a) => sum + (a.score ?? 0), 0);
        const result: WritingSectionResult = {
            answers: scoredAnswers,
            score: totalScore,
            maxScore: maxTasks * 15,
        };
        localStorage.removeItem(STORAGE_KEY);
        onComplete(result);
    }, [onComplete]);

    // ═══ INTRO SCREEN ═══
    if (phase === "intro") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-4">
                            <PenTool className="w-8 h-8 text-amber-500" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                            Yozish bo'limi
                        </h1>
                        <p className="text-muted-foreground">
                            {maxTasks} ta vazifa · Har biri 28 daqiqa · Jami {maxTasks * 15} ball
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-lg mb-6">
                        <h2 className="font-bold text-card-foreground mb-4 flex items-center gap-2">
                            <Keyboard className="w-4 h-4 text-amber-500" />
                            Ko'rsatmalar
                        </h2>

                        {/* Arabic instructions */}
                        <div
                            dir="rtl"
                            lang="ar"
                            className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-5 mb-5 space-y-3 text-sm leading-relaxed"
                            style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
                        >
                            <p>• يرجى التأكد من تفعيل لوحة المفاتيح العربية.</p>
                            <p>• إذا لم تكن لوحة المفاتيح العربية متوفرة على جهازك، يمكنك استخدام لوحة المفاتيح الافتراضية داخل النظام.</p>
                            <p>• يُنصح بكتابة ما يقارب ١٠٠ كلمة.</p>
                            <p>• تأكد من تنظيم الفقرات واستخدام علامات الترقيم.</p>
                        </div>

                        {/* Uzbek instructions */}
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span>Arab tilidagi klaviatura yoqilganligiga ishonch hosil qiling</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span>Har bir vazifa uchun 28 daqiqa vaqt beriladi</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span>Taxminan 100 so'z yozish tavsiya etiladi (80–130 oralig'ida)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span>Matn avtomatik saqlanadi — sahifani yopib qo'ysangiz ham davom ettira olasiz</span>
                            </li>
                        </ul>

                        {/* Rubric overview */}
                        <div className="mt-5 pt-4 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
                                Baholash mezonlari (har bir vazifa uchun 15 ball)
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {[
                                    { label: "Mazmun", pts: 3 },
                                    { label: "Tashkil", pts: 3 },
                                    { label: "Grammatika", pts: 3 },
                                    { label: "Lug'at", pts: 3 },
                                    { label: "Vazifa", pts: 3 },
                                ].map((r) => (
                                    <div
                                        key={r.label}
                                        className="text-center p-2 rounded-lg bg-muted/50 border border-border"
                                    >
                                        <div className="text-xs font-semibold text-card-foreground">{r.label}</div>
                                        <div className="text-xs text-muted-foreground">{r.pts} ball</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-6">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <p className="text-xs text-amber-400">
                            Imtihon vaqtida sahifani yopmaslik tavsiya etiladi. Matn avtomatik saqlanadi.
                        </p>
                    </div>

                    <button
                        onClick={handleStart}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-amber-500/30 transition-all active:scale-[0.98]"
                    >
                        Yozish bo'limini boshlash
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    // ═══ EXAM PHASE ═══
    if (phase === "exam" && currentIndex < selectedTasks.length) {
        const task = selectedTasks[currentIndex];
        const answer = answers.find((a) => a.taskId === task.id);

        return (
            <WritingTaskComponent
                key={task.id}
                task={task}
                taskNumber={currentIndex + 1}
                totalTasks={selectedTasks.length}
                initialText={answer?.text ?? ""}
                onTextChange={(text: string, wordCount: number) => handleTextChange(task.id, text, wordCount)}
                onComplete={(text: string, wordCount: number) => handleTaskComplete(task.id, text, wordCount)}
            />
        );
    }

    // ═══ PROCESSING PHASE ═══
    if (phase === "processing") {
        return (
            <WritingProcessing
                tasks={selectedTasks}
                answers={answers}
                onComplete={handleProcessingComplete}
            />
        );
    }

    return null;
}
