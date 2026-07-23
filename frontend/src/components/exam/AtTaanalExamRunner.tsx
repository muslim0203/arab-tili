// ─────────────────────────────────────────────────
// At-Taanal Exam Runner – main orchestrator (state machine)
// Grammar -> Reading -> Listening -> Writing -> Speaking -> Results
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArrowRight, RotateCcw } from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";
import { ExamStartCards } from "./ExamStartCards";
import { GrammarRunner } from "./GrammarRunner";
import { ReadingRunner } from "./ReadingRunner";
import { ListeningRunner } from "./ListeningRunner";
import { WritingRunner } from "./WritingRunner";
import { SpeakingRunner } from "./SpeakingRunner";
import { SpeakingWritingExamRunner } from "./SpeakingWritingExamRunner";
import { ExamResults } from "./ExamResults";
import { readingPassages, listeningStages as seedListeningStages, writingTasks, speakingQuestions } from "@/data/at-taanal-seed";
import { calcGrammarScore, calcReadingScore, calcListeningScore, generateId } from "@/utils/scoring";
import { api } from "@/lib/api";
import type {
    ExamPhase,
    ExamAttempt,
    Answer,
    GrammarQuestion,
    ListeningStage,
    PassageAttempt,
    ListeningStageAttempt,
    GrammarSectionResult,
    ReadingSectionResult,
    ListeningSectionResult,
    WritingSectionResult,
    SpeakingSectionResult,
} from "@/types/exam";

const STORAGE_KEY = "at-taanal-attempt";
const PHASE_KEY = "at-taanal-phase";

// Faqat imtihonning faol (davom etayotgan) bosqichlari
const ACTIVE_PHASES: ExamPhase[] = ["grammar", "reading", "listening", "writing", "speaking"];

function loadAttempt(): ExamAttempt | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as ExamAttempt;
    } catch {
        return null;
    }
}

function saveAttempt(attempt: ExamAttempt) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
}

function clearAttempt() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PHASE_KEY);
}

function savePhase(phase: ExamPhase) {
    localStorage.setItem(PHASE_KEY, phase);
}

function loadPhase(): ExamPhase | null {
    return (localStorage.getItem(PHASE_KEY) as ExamPhase | null) ?? null;
}

export function AtTaanalExamRunner() {
    const [phase, setPhase] = useState<ExamPhase>("cards");
    const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
    const attemptRef = useRef<ExamAttempt | null>(null);
    const [dbGrammarQuestions, setDbGrammarQuestions] = useState<GrammarQuestion[]>([]);
    const [grammarLoading, setGrammarLoading] = useState(false);
    const [dbListeningStages, setDbListeningStages] = useState<ListeningStage[]>([]);
    const [listeningLoading, setListeningLoading] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [pendingResume, setPendingResume] = useState<{ attempt: ExamAttempt; phase: ExamPhase } | null>(null);
    const [resuming, setResuming] = useState(false);
    const [showRestartConfirm, setShowRestartConfirm] = useState(false);

    // On mount, check for saved attempt
    useEffect(() => {
        const saved = loadAttempt();
        if (!saved) return;
        if (saved.status === "completed") {
            setAttempt(saved);
            setPhase("results");
            return;
        }
        // Tugallanmagan imtihon: bo'lim darajasida tiklashni taklif qilamiz (K5).
        // Tugagan bo'limlar saqlanadi; joriy bo'lim qaytadan boshlanadi.
        if (saved.status === "in_progress") {
            const savedPhase = loadPhase();
            if (savedPhase && ACTIVE_PHASES.includes(savedPhase)) {
                setPendingResume({ attempt: saved, phase: savedPhase });
            }
        }
    }, []);

    // ═══ DB yuklovchi yordamchilar (start va resume uchun umumiy) ═══
    const fetchGrammar = useCallback(async () => {
        setGrammarLoading(true);
        try {
            const data = await api<{ questions: GrammarQuestion[] }>("/exams/grammar/mixed");
            setDbGrammarQuestions(data.questions);
        } finally {
            setGrammarLoading(false);
        }
    }, []);

    const fetchListening = useCallback(async () => {
        setListeningLoading(true);
        try {
            const lisData = await api<{ stages: ListeningStage[] }>("/exams/listening/stages");
            setDbListeningStages(lisData.stages && lisData.stages.length > 0 ? lisData.stages : seedListeningStages);
        } catch (e) {
            console.warn("Listening stages DB dan yuklanmadi, seed ishlatiladi:", e);
            setDbListeningStages(seedListeningStages);
        } finally {
            setListeningLoading(false);
        }
    }, []);

    // ═══ Start the exam ═══
    const handleStart = useCallback(async () => {
        setIsStarting(true);
        // 1. Grammar savollari majburiy — yuklanmasa aniq xato ko'rsatamiz (K4)
        try {
            await fetchGrammar();
        } catch (e) {
            console.error("Grammar savollar yuklanmadi:", e);
            toast.error("Savollar yuklanmadi. Internetni tekshirib, qayta urinib ko'ring.");
            setIsStarting(false);
            return;
        }
        // 2. Listening stages (xato bo'lsa seed'ga tushadi)
        await fetchListening();

        // 3. Attempt yaratish
        const newAttempt: ExamAttempt = {
            id: generateId(),
            examType: "at-taanal",
            startedAt: new Date().toISOString(),
            status: "in_progress",
            sections: {
                grammar: null,
                reading: null,
                listening: null,
                writing: null,
                speaking: null,
            },
            totalScore: 0,
            maxPossibleScore: 150, // grammar(30) + reading(30) + listening(30) + writing(30) + speaking(30)
            level: null,
        };
        setAttempt(newAttempt);
        attemptRef.current = newAttempt;
        saveAttempt(newAttempt);
        savePhase("grammar");
        setIsStarting(false);
        setPhase("grammar");
    }, [fetchGrammar, fetchListening]);

    // ═══ Tugallanmagan imtihonni davom ettirish (K5) ═══
    const handleResumeConfirm = useCallback(async () => {
        if (!pendingResume) return;
        const { attempt: saved, phase: savedPhase } = pendingResume;
        setResuming(true);
        try {
            // Joriy bo'lim uchun kerakli DB ma'lumotini qayta yuklaymiz
            if (savedPhase === "grammar") await fetchGrammar();
            if (savedPhase === "listening") await fetchListening();
        } catch (e) {
            console.error("Imtihonni tiklab bo'lmadi:", e);
            toast.error("Imtihonni tiklab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.");
            setResuming(false);
            return;
        }
        setAttempt(saved);
        attemptRef.current = saved;
        setPendingResume(null);
        setResuming(false);
        setPhase(savedPhase);
    }, [pendingResume, fetchGrammar, fetchListening]);

    const handleResumeDiscard = useCallback(() => {
        clearAttempt();
        setPendingResume(null);
        setAttempt(null);
        setPhase("cards");
    }, []);

    // ═══ Grammar complete ═══
    const handleGrammarComplete = useCallback((answers: Answer[]) => {
        const score = calcGrammarScore(answers);
        const grammarResult: GrammarSectionResult = {
            answers,
            score,
            maxScore: 30,
        };

        setAttempt((prev) => {
            if (!prev) return prev;
            const updated = {
                ...prev,
                sections: { ...prev.sections, grammar: grammarResult },
            };
            attemptRef.current = updated;
            saveAttempt(updated);
            return updated;
        });

        savePhase("reading");
        setPhase("reading");
    }, []);

    // ═══ Grammar answer change (for persistence) ═══
    const handleGrammarAnswerChange = useCallback((answers: Answer[]) => {
        setAttempt((prev) => {
            if (!prev) return prev;
            const updated = {
                ...prev,
                sections: {
                    ...prev.sections,
                    grammar: {
                        answers,
                        score: calcGrammarScore(answers),
                        maxScore: 30 as const,
                    },
                },
            };
            attemptRef.current = updated;
            saveAttempt(updated);
            return updated;
        });
    }, []);

    // ═══ Reading complete ═══
    const handleReadingComplete = useCallback((passageAttempts: PassageAttempt[]) => {
        const allAnswers = passageAttempts.flatMap((p) => p.answers);
        const { rawCorrect, scaled } = calcReadingScore(allAnswers);
        const readingResult: ReadingSectionResult = {
            passages: passageAttempts,
            score: scaled,
            rawCorrect,
            maxScore: 30,
        };

        setAttempt((prev) => {
            if (!prev) return prev;
            const updated: ExamAttempt = {
                ...prev,
                sections: { ...prev.sections, reading: readingResult },
            };
            attemptRef.current = updated;
            saveAttempt(updated);
            return updated;
        });

        savePhase("listening");
        setPhase("listening");
    }, []);

    // ═══ Reading answer change (for persistence) ═══
    const handleReadingAnswerChange = useCallback(
        (passageAttempts: PassageAttempt[]) => {
            const allAnswers = passageAttempts.flatMap((p) => p.answers);
            const { rawCorrect, scaled } = calcReadingScore(allAnswers);
            setAttempt((prev) => {
                if (!prev) return prev;
                const updated = {
                    ...prev,
                    sections: {
                        ...prev.sections,
                        reading: {
                            passages: passageAttempts,
                            score: scaled,
                            rawCorrect,
                            maxScore: 30 as const,
                        },
                    },
                };
                attemptRef.current = updated;
                saveAttempt(updated);
                return updated;
            });
        },
        []
    );

    // ═══ Listening complete ═══
    const handleListeningComplete = useCallback(
        (stageAttempts: ListeningStageAttempt[]) => {
            const allAnswers = stageAttempts.flatMap((s) => s.answers);
            const { rawCorrect, scaled } = calcListeningScore(allAnswers);
            const listeningResult: ListeningSectionResult = {
                stages: stageAttempts,
                score: scaled,
                rawCorrect,
                maxScore: 30,
            };

            setAttempt((prev) => {
                if (!prev) return prev;
                const updated: ExamAttempt = {
                    ...prev,
                    sections: { ...prev.sections, listening: listeningResult },
                };
                attemptRef.current = updated;
                saveAttempt(updated);
                return updated;
            });

            savePhase("writing");
            setPhase("writing");
        },
        []
    );

    // ═══ Listening answer change (for persistence) ═══
    const handleListeningAnswerChange = useCallback(
        (stageAttempts: ListeningStageAttempt[]) => {
            const allAnswers = stageAttempts.flatMap((s) => s.answers);
            const { rawCorrect, scaled } = calcListeningScore(allAnswers);
            setAttempt((prev) => {
                if (!prev) return prev;
                const updated = {
                    ...prev,
                    sections: {
                        ...prev.sections,
                        listening: {
                            stages: stageAttempts,
                            score: scaled,
                            rawCorrect,
                            maxScore: 30 as const,
                        },
                    },
                };
                attemptRef.current = updated;
                saveAttempt(updated);
                return updated;
            });
        },
        []
    );

    // ═══ Writing complete ═══
    const handleWritingComplete = useCallback(
        (writingResult: WritingSectionResult) => {
            setAttempt((prev) => {
                if (!prev) return prev;
                const updated: ExamAttempt = {
                    ...prev,
                    sections: { ...prev.sections, writing: writingResult },
                };
                attemptRef.current = updated;
                saveAttempt(updated);
                return updated;
            });

            savePhase("speaking");
            setPhase("speaking");
        },
        []
    );

    // ═══ Speaking complete ═══
    const handleSpeakingComplete = useCallback(
        (speakingResult: SpeakingSectionResult) => {
            setAttempt((prev) => {
                if (!prev) return prev;
                const grammarScore = prev.sections.grammar?.score ?? 0;
                const readingScore = prev.sections.reading?.score ?? 0;
                const listeningScore = prev.sections.listening?.score ?? 0;
                const writingScore = prev.sections.writing?.score ?? 0;
                const totalScore = grammarScore + readingScore + listeningScore + writingScore + speakingResult.score;
                const updated: ExamAttempt = {
                    ...prev,
                    status: "completed",
                    completedAt: new Date().toISOString(),
                    sections: { ...prev.sections, speaking: speakingResult },
                    totalScore,
                    level: null, // Will be computed in results view
                };
                attemptRef.current = updated;
                saveAttempt(updated);
                return updated;
            });

            setPhase("results");
        },
        []
    );

    // ═══ Restart — tasdiqsiz o'chirmaymiz (O13) ═══
    const handleRestartRequest = useCallback(() => {
        setShowRestartConfirm(true);
    }, []);

    const handleRestartConfirm = useCallback(() => {
        clearAttempt();
        setAttempt(null);
        setShowRestartConfirm(false);
        setPhase("cards");
    }, []);

    // ═══ Start Speaking & Writing (separate exam) ═══
    const handleStartSpeakingWriting = useCallback(() => {
        setPhase("speaking-writing");
    }, []);

    // ═══ Faol imtihon bosqichlarida sahifadan chiqishda ogohlantirish (K5) ═══
    useEffect(() => {
        if (!ACTIVE_PHASES.includes(phase)) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [phase]);

    // ═══ Tugallanmagan imtihonni tiklash taklifi (K5) ═══
    if (pendingResume) {
        const phaseNames: Record<string, string> = {
            grammar: "Grammatika",
            reading: "O'qish",
            listening: "Tinglash",
            writing: "Yozish",
            speaking: "Gapirish",
        };
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
                <div className="max-w-md w-full rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-8 shadow-xl text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <RotateCcw className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-card-foreground mb-2">
                        Tugallanmagan imtihoningiz bor
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        Siz <span className="font-semibold text-card-foreground">{phaseNames[pendingResume.phase] ?? pendingResume.phase}</span> bo'limida to'xtagan edingiz.
                        Tugagan bo'limlar saqlanadi; joriy bo'lim qaytadan boshlanadi.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleResumeConfirm}
                            disabled={resuming}
                            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {resuming ? "Tiklanmoqda…" : "Davom etish"}
                            {!resuming && <ArrowRight className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={handleResumeDiscard}
                            disabled={resuming}
                            className="flex-1 py-3 px-4 rounded-xl border border-border bg-card text-card-foreground font-semibold text-sm hover:bg-muted/50 transition-all disabled:opacity-70"
                        >
                            Boshdan boshlash
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══ Render phases ═══
    switch (phase) {
        case "cards":
            return (
                <ExamStartCards
                    onStartAtTaanal={handleStart}
                    onStartSpeakingWriting={handleStartSpeakingWriting}
                    isStarting={isStarting}
                />
            );

        case "speaking-writing":
            return <SpeakingWritingExamRunner />;

        case "grammar":
            if (grammarLoading || dbGrammarQuestions.length === 0) {
                return (
                    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-lg text-muted-foreground">Grammatika savollari yuklanmoqda...</p>
                        </div>
                    </div>
                );
            }
            return (
                <GrammarRunner
                    questions={dbGrammarQuestions}
                    onComplete={handleGrammarComplete}
                    onAnswerChange={handleGrammarAnswerChange}
                />
            );

        case "reading":
            return (
                <ReadingRunner
                    passages={readingPassages}
                    onComplete={handleReadingComplete}
                    onAnswerChange={handleReadingAnswerChange}
                />
            );

        case "listening":
            if (listeningLoading) {
                return (
                    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5 flex items-center justify-center p-4">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-lg text-muted-foreground">Tinglash savollari yuklanmoqda...</p>
                        </div>
                    </div>
                );
            }
            return (
                <ListeningRunner
                    stages={dbListeningStages.length > 0 ? dbListeningStages : seedListeningStages}
                    onComplete={handleListeningComplete}
                    onAnswerChange={handleListeningAnswerChange}
                />
            );

        case "writing":
            return (
                <WritingRunner
                    tasks={writingTasks}
                    onComplete={handleWritingComplete}
                />
            );

        case "speaking":
            return (
                <SpeakingRunner
                    questions={speakingQuestions}
                    onComplete={handleSpeakingComplete}
                />
            );

        case "results":
            if (!attempt) return null;
            return (
                <>
                    <ExamResults attempt={attempt} onRestart={handleRestartRequest} />
                    <ConfirmModal
                        open={showRestartConfirm}
                        title="Qayta topshirasizmi?"
                        description="Joriy natijangiz o'chiriladi va bu amalni bekor qilib bo'lmaydi."
                        confirmLabel="Ha, qayta topshirish"
                        cancelLabel="Bekor qilish"
                        onConfirm={handleRestartConfirm}
                        onCancel={() => setShowRestartConfirm(false)}
                    />
                </>
            );

        default:
            return null;
    }
}
