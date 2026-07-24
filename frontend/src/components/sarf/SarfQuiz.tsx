import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, ChevronRight, Trophy, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SarfQuestion } from "@/lib/sarf-types";

interface SarfQuizProps {
  questions: SarfQuestion[];
  onComplete: (answers: number[]) => void;
  isSubmitting?: boolean;
}

/** Katakda arabcha bo'lsa RTL + arab shrifti bilan chiqarish uchun. */
function hasArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export function SarfQuiz({ questions, onComplete, isSubmitting }: SarfQuizProps) {
  const total = questions.length;
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => new Array(total).fill(-1));
  const [finished, setFinished] = useState(false);

  const score = useMemo(
    () => answers.reduce((acc, ans, i) => (ans === questions[i].correctIndex ? acc + 1 : acc), 0),
    [answers, questions]
  );

  const question = questions[current];
  const selected = answers[current];
  const answered = selected !== -1;
  const isLast = current === total - 1;

  const select = (index: number) => {
    if (answered) return; // bitta savolga bir marta javob
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = index;
      return next;
    });
  };

  const goNext = () => {
    if (isLast) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const restart = () => {
    setAnswers(new Array(total).fill(-1));
    setCurrent(0);
    setFinished(false);
  };

  // ── Natija ekrani ──────────────────────────────────────────
  if (finished) {
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Trophy className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="text-xl font-bold text-foreground">Mashq yakunlandi</h3>
        <p className="mt-1 text-muted-foreground">
          {total} savoldan{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{score}</span> tasi to'g'ri
        </p>
        <p className="mt-4 text-4xl font-extrabold tracking-tight text-foreground">{percent}%</p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            className="rounded-xl"
            onClick={() => onComplete(answers)}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yakunlash va saqlash"}
          </Button>
          <Button variant="outline" className="rounded-xl gap-2" onClick={restart} disabled={isSubmitting}>
            <RotateCcw className="h-4 w-4" />
            Qaytadan
          </Button>
        </div>
      </motion.div>
    );
  }

  // ── Savol ekrani ───────────────────────────────────────────
  const answeredCount = answers.filter((a) => a !== -1).length;
  const progressPercent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      {/* Progress bar */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            Savol {current + 1} / {total}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
        >
          <p
            className={cn(
              "mb-4 text-base font-semibold text-foreground sm:text-lg",
              hasArabic(question.prompt) && "font-arabic text-xl"
            )}
            dir={hasArabic(question.prompt) ? "rtl" : undefined}
          >
            {question.prompt}
          </p>

          <div className="space-y-2.5">
            {question.options.map((option, index) => {
              const isCorrect = index === question.correctIndex;
              const isChosen = index === selected;

              let state: "idle" | "correct" | "wrong" | "reveal" = "idle";
              if (answered) {
                if (isCorrect) state = "correct";
                else if (isChosen) state = "wrong";
                else state = "reveal";
              }

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => select(index)}
                  disabled={answered}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-start transition-all",
                    state === "idle" &&
                      "border-input bg-background hover:border-primary/40 hover:bg-muted/50",
                    state === "correct" &&
                      "border-emerald-500/50 bg-emerald-500/10",
                    state === "wrong" && "border-red-500/50 bg-red-500/10",
                    state === "reveal" && "border-input bg-background opacity-60",
                    answered && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      state === "correct" && "bg-emerald-500 text-white",
                      state === "wrong" && "bg-red-500 text-white",
                      (state === "idle" || state === "reveal") && "bg-muted text-muted-foreground"
                    )}
                  >
                    {state === "correct" ? (
                      <Check className="h-4 w-4" />
                    ) : state === "wrong" ? (
                      <X className="h-4 w-4" />
                    ) : (
                      OPTION_LABELS[index]
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-sm text-foreground",
                      hasArabic(option) && "font-arabic text-lg"
                    )}
                    dir={hasArabic(option) ? "rtl" : undefined}
                  >
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feedback / izoh */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className={cn(
                    "mt-4 rounded-xl border p-4 text-sm",
                    selected === question.correctIndex
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                      : "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200"
                  )}
                >
                  <p className="font-semibold">
                    {selected === question.correctIndex ? "To'g'ri!" : "Noto'g'ri"}
                  </p>
                  {selected !== question.correctIndex && (
                    <p className="mt-1">
                      To'g'ri javob:{" "}
                      <span
                        className={cn(hasArabic(question.options[question.correctIndex]) && "font-arabic text-base")}
                        dir={hasArabic(question.options[question.correctIndex]) ? "rtl" : undefined}
                      >
                        {question.options[question.correctIndex]}
                      </span>
                    </p>
                  )}
                  <p className="mt-1 text-foreground/80">{question.explanation}</p>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button className="rounded-xl gap-2" onClick={goNext}>
                    {isLast ? "Natijani ko'rish" : "Keyingi savol"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
