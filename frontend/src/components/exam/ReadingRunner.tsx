// ─────────────────────────────────────────────────
// Reading Runner – with intro screen – O'zbek UI
// ─────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { PassageRunner } from "./PassageRunner";
import type { ReadingPassage, Answer, PassageAttempt } from "@/types/exam";
import { BookOpen, ArrowRight, FileText, Clock, Layers } from "lucide-react";

interface ReadingRunnerProps {
    passages: ReadingPassage[];
    onComplete: (passageAttempts: PassageAttempt[]) => void;
    onAnswerChange?: (passageAttempts: PassageAttempt[]) => void;
}

export function ReadingRunner({
    passages,
    onComplete,
    onAnswerChange,
}: ReadingRunnerProps) {
    const [showIntro, setShowIntro] = useState(true);
    const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
    const [passageAttempts, setPassageAttempts] = useState<PassageAttempt[]>([]);

    const totalQuestions = passages.reduce((sum, p) => sum + p.questions.length, 0);

    const handlePassageComplete = useCallback(
        (answers: Answer[]) => {
            const correctCount = answers.filter((a) => a.isCorrect === true).length;
            const attempt: PassageAttempt = {
                passageId: passages[currentPassageIndex].id,
                answers,
                score: correctCount,
            };

            const updated = [...passageAttempts, attempt];
            setPassageAttempts(updated);

            if (currentPassageIndex === passages.length - 1) {
                onComplete(updated);
            } else {
                setCurrentPassageIndex((prev) => prev + 1);
            }
        },
        [currentPassageIndex, passages, passageAttempts, onComplete]
    );

    const handleAnswerChange = useCallback(
        (passageId: string, answers: Answer[]) => {
            const correctCount = answers.filter((a) => a.isCorrect === true).length;
            const tempAttempts = [
                ...passageAttempts,
                { passageId, answers, score: correctCount },
            ];
            onAnswerChange?.(tempAttempts);
        },
        [passageAttempts, onAnswerChange]
    );

    // ═══════════════ READING SECTION INTRO ═══════════════
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

                        <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                            2-bo'lim: O'qish (Reading)
                        </h2>
                        <p className="text-muted-foreground text-center mb-8">
                            Arab tilidagi matnlarni o'qib, savollarga javob bering
                        </p>

                        {/* General info */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                <Layers className="w-5 h-5 text-blue-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Matnlar soni</p>
                                    <p className="text-sm text-muted-foreground">{passages.length} ta matn (osondan qiyinga)</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <FileText className="w-5 h-5 text-primary shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Savollar soni</p>
                                    <p className="text-sm text-muted-foreground">Jami {totalQuestions} ta savol ({passages.map(p => p.questions.length).join(" + ")})</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-card-foreground">Har bir matn 2 bosqichli</p>
                                    <p className="text-sm text-muted-foreground">1) O'qish vaqti → 2) Savollar vaqti</p>
                                </div>
                            </div>
                        </div>

                        {/* Passage details table */}
                        <div className="rounded-xl border border-border overflow-hidden mb-8">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/50">
                                        <th className="px-4 py-2 text-left font-semibold text-card-foreground">Matn</th>
                                        <th className="px-4 py-2 text-center font-semibold text-card-foreground">O'qish</th>
                                        <th className="px-4 py-2 text-center font-semibold text-card-foreground">Savollar</th>
                                        <th className="px-4 py-2 text-center font-semibold text-card-foreground">Vaqt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {passages.map((p, i) => (
                                        <tr key={p.id} className="border-t border-border">
                                            <td className="px-4 py-2.5 text-card-foreground font-medium">
                                                {i + 1}-matn
                                                <span className="text-xs text-muted-foreground ml-1">
                                                    ({["Oson", "O'rta", "Qiyin"][i]})
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center text-muted-foreground">
                                                {Math.floor(p.readingTimeSec / 60)} daq
                                            </td>
                                            <td className="px-4 py-2.5 text-center text-muted-foreground">
                                                {p.questions.length} ta
                                            </td>
                                            <td className="px-4 py-2.5 text-center text-muted-foreground">
                                                {Math.floor(p.questionTimeSec / 60)} daq
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button
                            onClick={() => setShowIntro(false)}
                            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 active:scale-[0.98]"
                        >
                            O'qish bo'limini boshlash
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════ PASSAGE RUNNERS ═══════════════
    const currentPassage = passages[currentPassageIndex];

    return (
        <PassageRunner
            key={currentPassage.id}
            passage={currentPassage}
            passageNumber={currentPassageIndex + 1}
            totalPassages={passages.length}
            onComplete={handlePassageComplete}
            onAnswerChange={handleAnswerChange}
        />
    );
}
