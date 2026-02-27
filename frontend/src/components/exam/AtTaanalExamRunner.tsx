// ─────────────────────────────────────────────────
// At-Taanal Exam Runner – main orchestrator (state machine)
// Grammar -> Reading -> Listening -> Writing -> Speaking -> Results
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
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
}

export function AtTaanalExamRunner() {
    const [phase, setPhase] = useState<ExamPhase>("cards");
    const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
    const attemptRef = useRef<ExamAttempt | null>(null);
    const [dbGrammarQuestions, setDbGrammarQuestions] = useState<GrammarQuestion[]>([]);
    const [grammarLoading, setGrammarLoading] = useState(false);
    const [dbListeningStages, setDbListeningStages] = useState<ListeningStage[]>([]);
    const [listeningLoading, setListeningLoading] = useState(false);

    // On mount, check for saved attempt
    useEffect(() => {
        const saved = loadAttempt();
        if (saved && saved.status === "completed") {
            setAttempt(saved);
            setPhase("results");
        }
        // If in_progress, we cannot fully restore mid-question (timers lost).
        // So we let user restart from cards.
    }, []);

    // ═══ Start the exam ═══
    const handleStart = useCallback(async () => {
        // 1. DB'dan grammar savollarni yuklash
        setGrammarLoading(true);
        try {
            const data = await api<{ questions: GrammarQuestion[] }>("/exams/grammar/mixed");
            setDbGrammarQuestions(data.questions);
        } catch (e) {
            console.error("Grammar savollar yuklanmadi:", e);
            setGrammarLoading(false);
            return;
        }
        setGrammarLoading(false);

        // 3. Listening stages ni DB dan yuklash
        setListeningLoading(true);
        try {
            const lisData = await api<{ stages: ListeningStage[] }>("/exams/listening/stages");
            if (lisData.stages && lisData.stages.length > 0) {
                setDbListeningStages(lisData.stages);
            } else {
                // DB da stage yo'q — seed ma'lumotlaridan foydalanish
                setDbListeningStages(seedListeningStages);
            }
        } catch (e) {
            console.warn("Listening stages DB dan yuklanmadi, seed ishlatiladi:", e);
            setDbListeningStages(seedListeningStages);
        }
        setListeningLoading(false);

        // 4. Attempt yaratish
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
        setPhase("grammar");
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

    // ═══ Restart ═══
    const handleRestart = useCallback(() => {
        clearAttempt();
        setAttempt(null);
        setPhase("cards");
    }, []);

    // ═══ Start Speaking & Writing (separate exam) ═══
    const handleStartSpeakingWriting = useCallback(() => {
        setPhase("speaking-writing");
    }, []);

    // ═══ Render phases ═══
    switch (phase) {
        case "cards":
            return (
                <ExamStartCards
                    onStartAtTaanal={handleStart}
                    onStartSpeakingWriting={handleStartSpeakingWriting}
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
            return <ExamResults attempt={attempt} onRestart={handleRestart} />;

        default:
            return null;
    }
}
