// ─────────────────────────────────────────────────
// At-Taanal Exam Runner – main orchestrator (state machine)
// Grammar -> Reading -> Listening -> Results
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
import { ExamStartCards } from "./ExamStartCards";
import { GrammarRunner } from "./GrammarRunner";
import { ReadingRunner } from "./ReadingRunner";
import { ListeningRunner } from "./ListeningRunner";
import { ExamResults } from "./ExamResults";
import { grammarQuestions, readingPassages, listeningStages } from "@/data/at-taanal-seed";
import { calcGrammarScore, calcReadingScore, calcListeningScore, generateId } from "@/utils/scoring";
import type {
    ExamPhase,
    ExamAttempt,
    Answer,
    PassageAttempt,
    ListeningStageAttempt,
    GrammarSectionResult,
    ReadingSectionResult,
    ListeningSectionResult,
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
    const handleStart = useCallback(() => {
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
            maxPossibleScore: 90, // grammar(30) + reading(30) + listening(30)
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
                const grammarScore = prev.sections.grammar?.score ?? 0;
                const readingScore = prev.sections.reading?.score ?? 0;
                const totalScore = grammarScore + readingScore + scaled;
                const updated: ExamAttempt = {
                    ...prev,
                    status: "completed",
                    completedAt: new Date().toISOString(),
                    sections: { ...prev.sections, listening: listeningResult },
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

    // ═══ Restart ═══
    const handleRestart = useCallback(() => {
        clearAttempt();
        setAttempt(null);
        setPhase("cards");
    }, []);

    // ═══ Render phases ═══
    switch (phase) {
        case "cards":
            return <ExamStartCards onStartAtTaanal={handleStart} />;

        case "grammar":
            return (
                <GrammarRunner
                    questions={grammarQuestions}
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
            return (
                <ListeningRunner
                    stages={listeningStages}
                    onComplete={handleListeningComplete}
                    onAnswerChange={handleListeningAnswerChange}
                />
            );

        case "results":
            if (!attempt) return null;
            return <ExamResults attempt={attempt} onRestart={handleRestart} />;

        default:
            return null;
    }
}
