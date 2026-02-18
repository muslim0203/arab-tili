// ─────────────────────────────────────────────────
// Passage Runner – with intro screen – O'zbek UI
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from "react";
import { Timer } from "./Timer";
import { createDeadline } from "@/utils/timer";
import { formatTime } from "@/utils/timer";
import type { ReadingPassage, Answer, PassagePhase } from "@/types/exam";
import { BookOpen, CheckCircle2, Eye, Clock, HelpCircle, ArrowRight, FileText } from "lucide-react";

interface PassageRunnerProps {
    passage: ReadingPassage;
    passageNumber: number;
    totalPassages: number;
    onComplete: (answers: Answer[]) => void;
    onAnswerChange?: (passageId: string, answers: Answer[]) => void;
}

export function PassageRunner({
    passage,
    passageNumber,
    totalPassages,
    onComplete,
    onAnswerChange,
}: PassageRunnerProps) {
    const [showIntro, setShowIntro] = useState(true);
    const [phase, setPhase] = useState<PassagePhase>("reading");
    const [questionIndex, setQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [deadline, setDeadline] = useState(0);
    const completedRef = useRef(false);

    const currentQuestion = passage.questions[questionIndex];
    const isLastQuestion = questionIndex === passage.questions.length - 1;

    useEffect(() => {
        onAnswerChange?.(passage.id, answers);
    }, [answers, passage.id, onAnswerChange]);

    const handleStartPassage = useCallback(() => {
        setShowIntro(false);
        setDeadline(createDeadline(passage.readingTimeSec));
    }, [passage.readingTimeSec]);

    const handleReadingExpire = useCallback(() => {
        setPhase("questions");
        setDeadline(createDeadline(passage.questionTimeSec));
    }, [passage.questionTimeSec]);

    const handleQuestionsExpire = useCallback(() => {
        if (completedRef.current) return;
        completedRef.current = true;

        const remaining: Answer[] = [];
        for (let i = questionIndex; i < passage.questions.length; i++) {
            const alreadyAnswered = answers.find(
                (a) => a.questionId === passage.questions[i].id
            );
            if (!alreadyAnswered) {
                const sel = i === questionIndex ? selectedOption : null;
                remaining.push({
                    questionId: passage.questions[i].id,
                    selectedIndex: sel,
                    isCorrect:
                        sel !== null ? sel === passage.questions[i].correctIndex : null,
                });
            }
        }
        const finalAnswers = [...answers, ...remaining];
        onComplete(finalAnswers);
    }, [questionIndex, selectedOption, answers, passage.questions, onComplete]);

    const goNextQuestion = useCallback(() => {
        if (completedRef.current) return;

        const answer: Answer = {
            questionId: currentQuestion.id,
            selectedIndex: selectedOption,
            isCorrect:
                selectedOption !== null
                    ? selectedOption === currentQuestion.correctIndex
                    : null,
        };

        const newAnswers = [...answers, answer];
        setAnswers(newAnswers);

        if (isLastQuestion) {
            completedRef.current = true;
            onComplete(newAnswers);
        } else {
            setQuestionIndex((prev) => prev + 1);
            setSelectedOption(null);
        }
    }, [currentQuestion, selectedOption, answers, isLastQuestion, onComplete]);

    const skipToQuestions = useCallback(() => {
        setPhase("questions");
        setDeadline(createDeadline(passage.questionTimeSec));
    }, [passage.questionTimeSec]);

    const optionLabels = ["A", "B", "C", "D"];

    // Passage difficulty label
    const difficultyLabels = ["Oson", "O'rta", "Qiyin"];
    const difficultyColors = [
        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        "bg-amber-500/10 text-amber-500 border-amber-500/20",
        "bg-red-500/10 text-red-500 border-red-500/20",
    ];

    // ═══════════════ INTRO SCREEN ═══════════════
    if (showIntro) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
                <div className="max-w-lg w-full">
                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-xl">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-card-foreground text-center mb-1">
                            Matn {passageNumber} / {totalPassages}
                        </h2>

                        {/* Difficulty */}
                        <div className="flex justify-center mb-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${difficultyColors[passageNumber - 1]}`}>
                                {difficultyLabels[passageNumber - 1]} daraja
                            </span>
                        </div>

                        {/* Info cards */}
                        <div className="space-y-3 mb-8">
                            {/* Reading phase */}
                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <Eye className="w-5 h-5 text-blue-500 shrink-0" />
                                    <p className="font-semibold text-card-foreground">1-bosqich: O'qish</p>
                                </div>
                                <ul className="text-sm text-muted-foreground space-y-1 ml-8">
                                    <li className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        O'qish vaqti: <strong className="text-card-foreground">{formatTime(passage.readingTimeSec)}</strong>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5" />
                                        Matn ko'rsatiladi, savollar yo'q
                                    </li>
                                </ul>
                            </div>

                            {/* Questions phase */}
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <HelpCircle className="w-5 h-5 text-primary shrink-0" />
                                    <p className="font-semibold text-card-foreground">2-bosqich: Savollar</p>
                                </div>
                                <ul className="text-sm text-muted-foreground space-y-1 ml-8">
                                    <li className="flex items-center gap-2">
                                        <span className="font-bold text-card-foreground">{passage.questions.length}</span> ta test savoli
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        Umumiy vaqt: <strong className="text-card-foreground">{formatTime(passage.questionTimeSec)}</strong>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Rules */}
                        <div className="p-4 rounded-xl bg-muted/50 border border-border mb-8">
                            <p className="text-sm font-semibold text-card-foreground mb-2">Eslatmalar:</p>
                            <ul className="text-sm text-muted-foreground space-y-1.5">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    O'qish vaqtida matnni diqqat bilan o'qing
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    Savollar vaqtida matnni qayta ko'rishingiz mumkin
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    Vaqt tugasa, javob berilmagan savollar bo'sh qoladi
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={handleStartPassage}
                            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 active:scale-[0.98]"
                        >
                            O'qishni boshlash
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════ READING PHASE ═══════════════
    if (phase === "reading") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
                <div className="max-w-3xl w-full">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-bold flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                O'qish bosqichi
                            </div>
                            <span className="text-sm text-muted-foreground">
                                Matn {passageNumber} / {totalPassages}
                            </span>
                        </div>
                        <Timer
                            key={`read-${deadline}`}
                            deadline={deadline}
                            onExpire={handleReadingExpire}
                            size="md"
                            warnAt={30}
                            dangerAt={10}
                            label="O'qish vaqti"
                        />
                    </div>

                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                            <BookOpen className="w-6 h-6 text-primary" />
                            <h2 className="text-lg font-bold text-card-foreground">
                                Quyidagi matnni diqqat bilan o'qing
                            </h2>
                        </div>
                        <div
                            className="text-lg md:text-xl leading-[2.2] text-card-foreground font-medium border-r-4 border-primary/30 pr-6"
                            dir="rtl"
                        >
                            {passage.text}
                        </div>
                        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                ⏳ Matnni diqqat bilan o'qing. O'qish vaqti tugagandan so'ng savollar paydo bo'ladi.
                            </p>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={skipToQuestions}
                                className="px-6 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                            >
                                Savollarga o'tish →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════ QUESTIONS PHASE ═══════════════
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
            <div className="max-w-3xl w-full">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm font-bold">
                            O'qish — Matn {passageNumber}
                        </div>
                        <span className="text-sm text-muted-foreground">
                            Savol {questionIndex + 1} / {passage.questions.length}
                        </span>
                    </div>
                    <Timer
                        key={`q-${deadline}`}
                        deadline={deadline}
                        onExpire={handleQuestionsExpire}
                        size="md"
                        warnAt={60}
                        dangerAt={20}
                        label="Savollar vaqti"
                    />
                </div>

                <div className="w-full h-2 rounded-full bg-muted mb-6 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-primary transition-all duration-500 ease-out"
                        style={{
                            width: `${((questionIndex + 1) / passage.questions.length) * 100}%`,
                        }}
                    />
                </div>

                <details className="rounded-xl border border-border bg-card/60 mb-4 group">
                    <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-muted-foreground flex items-center gap-2 hover:text-primary transition-colors">
                        <BookOpen className="w-4 h-4" />
                        Matnni ko'rish
                    </summary>
                    <div
                        className="px-6 pb-4 text-base leading-[2] text-card-foreground border-r-4 border-primary/20 mr-4"
                        dir="rtl"
                    >
                        {passage.text}
                    </div>
                </details>

                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-lg">
                    <p
                        className="text-xl md:text-2xl font-semibold text-card-foreground mb-8 leading-relaxed"
                        dir="rtl"
                    >
                        {currentQuestion.prompt}
                    </p>

                    <div className="space-y-3" dir="rtl">
                        {currentQuestion.options.map((option, idx) => {
                            const isSelected = selectedOption === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedOption(idx)}
                                    className={`
                    w-full text-right p-4 rounded-xl border-2 transition-all duration-200
                    flex items-center gap-4 group
                    ${isSelected
                                            ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                                            : "border-border hover:border-primary/40 hover:bg-primary/5"
                                        }
                  `}
                                >
                                    <span
                                        className={`
                      w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0
                      transition-all duration-200
                      ${isSelected
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                                            }
                    `}
                                    >
                                        {optionLabels[idx]}
                                    </span>
                                    <span className="text-base md:text-lg font-medium flex-1">
                                        {option}
                                    </span>
                                    {isSelected && (
                                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={goNextQuestion}
                            disabled={selectedOption === null}
                            className={`
                px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                flex items-center gap-2
                ${selectedOption !== null
                                    ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                                }
              `}
                        >
                            {isLastQuestion ? "Matnni yakunlash" : "Keyingisi"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
