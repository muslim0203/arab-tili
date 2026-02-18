// ─────────────────────────────────────────────────
// Grammar Runner – with intro screen – O'zbek UI
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from "react";
import { Timer } from "./Timer";
import { createDeadline } from "@/utils/timer";
import type { GrammarQuestion, Answer } from "@/types/exam";
import { CheckCircle2, FileText, Clock, HelpCircle, ArrowRight, Zap } from "lucide-react";

interface GrammarRunnerProps {
    questions: GrammarQuestion[];
    onComplete: (answers: Answer[]) => void;
    onAnswerChange?: (answers: Answer[]) => void;
}

const PER_QUESTION_SEC = 60;

export function GrammarRunner({
    questions,
    onComplete,
    onAnswerChange,
}: GrammarRunnerProps) {
    const [started, setStarted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [deadline, setDeadline] = useState(0);
    const completedRef = useRef(false);

    const question = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;

    useEffect(() => {
        onAnswerChange?.(answers);
    }, [answers, onAnswerChange]);

    const handleStart = useCallback(() => {
        setStarted(true);
        setDeadline(createDeadline(PER_QUESTION_SEC));
    }, []);

    const goNext = useCallback(() => {
        if (completedRef.current) return;

        const answer: Answer = {
            questionId: question.id,
            selectedIndex: selectedOption,
            isCorrect:
                selectedOption !== null ? selectedOption === question.correctIndex : null,
        };

        const newAnswers = [...answers, answer];
        setAnswers(newAnswers);

        if (isLast) {
            completedRef.current = true;
            onComplete(newAnswers);
        } else {
            setCurrentIndex((prev) => prev + 1);
            setSelectedOption(null);
            setDeadline(createDeadline(PER_QUESTION_SEC));
        }
    }, [question, selectedOption, answers, isLast, onComplete]);

    const handleExpire = useCallback(() => {
        goNext();
    }, [goNext]);

    const optionLabels = ["A", "B", "C", "D"];

    // ═══════════════ INTRO SCREEN ═══════════════
    if (!started) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
                <div className="max-w-lg w-full">
                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-xl">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <FileText className="w-8 h-8 text-primary" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                            1-bo'lim: Grammatika
                        </h2>
                        <p className="text-muted-foreground text-center mb-8">
                            Arab tili grammatikasi bo'yicha test savollari
                        </p>

                        {/* Info cards */}
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <HelpCircle className="w-5 h-5 text-primary shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Savollar soni</p>
                                    <p className="text-sm text-muted-foreground">{questions.length} ta test savoli (A, B, C, D)</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Vaqt</p>
                                    <p className="text-sm text-muted-foreground">Har bir savol uchun 1 daqiqa (60 soniya)</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                                <Zap className="w-5 h-5 text-red-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Muhim</p>
                                    <p className="text-sm text-muted-foreground">Vaqt tugasa, avtomatik keyingi savolga o'tiladi</p>
                                </div>
                            </div>
                        </div>

                        {/* Rules */}
                        <div className="p-4 rounded-xl bg-muted/50 border border-border mb-8">
                            <p className="text-sm font-semibold text-card-foreground mb-2">Qoidalar:</p>
                            <ul className="text-sm text-muted-foreground space-y-1.5">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    Har bir savolda 4 ta variant beriladi
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    Javobni tanlang va "Keyingisi" tugmasini bosing
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    Javob tanlanmasa ham vaqt tugaganda keyingi savolga o'tiladi
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    Oldingi savollarga qaytib bo'lmaydi
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={handleStart}
                            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 active:scale-[0.98]"
                        >
                            Boshlash
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════ QUESTION SCREEN ═══════════════
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm font-bold">
                            Grammatika
                        </div>
                        <span className="text-sm text-muted-foreground">
                            Savol {currentIndex + 1} / {questions.length}
                        </span>
                    </div>
                    <Timer
                        key={deadline}
                        deadline={deadline}
                        onExpire={handleExpire}
                        size="md"
                        warnAt={15}
                        dangerAt={5}
                    />
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-muted mb-8 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                        style={{
                            width: `${((currentIndex + 1) / questions.length) * 100}%`,
                        }}
                    />
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
                            onClick={goNext}
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
                            {isLast ? "Grammatikani yakunlash" : "Keyingisi"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
