import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/app/AppLayout";
import { StatsCard } from "@/components/app/StatsCard";
import { Badge } from "@/components/app/Badge";
import { api } from "@/lib/api";
import { Loader2, Award, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<string, string> = {
  listening: "Listening",
  reading: "Reading",
  language_use: "Language Use",
  writing: "Writing",
  speaking: "Speaking",
};

type QuestionResult = {
  id: string;
  order: number;
  questionText: string;
  options: unknown;
  correctAnswer: unknown;
  points: number;
  maxScore?: number | null;
  userAnswer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number | null;
  score: number | null;
  feedback: string | null;
  section?: string;
  taskType?: string;
};

type ResultsData = {
  attemptId: string;
  status: string;
  completedAt: string | null;
  totalScore: number | null;
  maxPossibleScore: number | null;
  percentage: number | null;
  cefrLevelAchieved: string | null;
  cefrFeedback: string | null;
  sectionScores: Record<string, { score: number; max: number }> | null;
  exam: { id: string; title: string; durationMinutes: number } | null;
  level?: string | null;
  questions: QuestionResult[];
};

export function AttemptResults() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["attempt-results", attemptId],
    queryFn: () => api<ResultsData>(`/attempts/${attemptId}/results`),
    enabled: !!attemptId,
  });

  if (isLoading || !data) {
    return (
      <AppLayout maxWidth="max-w-2xl">
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }
  if (error) {
    return (
      <AppLayout maxWidth="max-w-2xl">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          {error instanceof Error ? error.message : "Natija yuklanmadi"}
        </div>
      </AppLayout>
    );
  }

  const total = data.totalScore ?? 0;
  const max = data.maxPossibleScore ?? 1;
  const pct = data.percentage ?? 0;
  const cefr = data.cefrLevelAchieved ?? "—";

  return (
    <AppLayout maxWidth="max-w-2xl">
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="rounded-xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">
              {data.exam?.title ?? `CEFR ${data.level ?? ""}`} – Natija
            </CardTitle>
            <CardDescription>
              {new Date(data.completedAt ?? "").toLocaleString("uz-UZ")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatsCard
                label="Ball"
                value={
                  <>
                    {total} / {max}
                    <span className="block text-sm font-normal text-muted-foreground">
                      {pct.toFixed(1)}%
                    </span>
                  </>
                }
              />
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">CEFR darajasi</p>
                <div className="mt-2">
                  <Badge cefr={cefr !== "—" ? cefr : undefined} className="text-base px-3 py-1">
                    {cefr}
                  </Badge>
                </div>
              </div>
            </div>
            {data.cefrFeedback && (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="mb-1 text-sm font-medium text-muted-foreground">AI bahosi</p>
                <p className="text-sm">{data.cefrFeedback}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Savol bo'yicha ko'rib chiqish</h2>
          <div className="space-y-4">
            {data.questions.map((q, i) => {
              const correctStr =
                q.correctAnswer != null
                  ? typeof q.correctAnswer === "object"
                    ? JSON.stringify(q.correctAnswer)
                    : String(q.correctAnswer)
                  : "";
              const isWritingSpeaking = q.section === "writing" || q.section === "speaking";
              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card className="rounded-xl border-border shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        {typeof q.isCorrect === "boolean" ? (
                          q.isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 mt-0.5" aria-hidden />
                          ) : (
                            <XCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" aria-hidden />
                          )
                        ) : isWritingSpeaking && q.score != null ? (
                          <span className="shrink-0 mt-0.5 text-sm font-medium text-primary">
                            {q.score}/{q.maxScore ?? q.points}
                          </span>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          {q.section && (
                            <p className="text-xs text-muted-foreground">
                              {SECTION_LABELS[q.section] ?? q.section}
                            </p>
                          )}
                          <CardTitle className="text-base">Savol {q.order}</CardTitle>
                          <p className="mt-1 whitespace-pre-wrap text-foreground" dir="auto">
                            {q.questionText}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm pt-0">
                      <p>
                        <span className="text-muted-foreground">Sizning javobingiz:</span>{" "}
                        {q.userAnswer ?? "—"}
                      </p>
                      {!isWritingSpeaking && correctStr && q.isCorrect === false && (
                        <p>
                          <span className="text-muted-foreground">To'g'ri javob:</span> {correctStr}
                        </p>
                      )}
                      {isWritingSpeaking && q.feedback && (
                        <div className="rounded-lg bg-muted/50 p-3 mt-2">
                          <p className="text-muted-foreground">Feedback:</p>
                          <p>{q.feedback}</p>
                        </div>
                      )}
                      <p className="text-muted-foreground">
                        {isWritingSpeaking
                          ? q.score != null
                            ? `${q.score} / ${q.maxScore ?? q.points} ball`
                            : "—"
                          : `${q.pointsEarned ?? 0} / ${q.points} ball`}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="default" className="rounded-xl">
            <Link to="/exams">Boshqa imtihon</Link>
          </Button>
          <Button variant="outline" asChild size="default" className="rounded-xl">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </motion.div>
    </AppLayout>
  );
}
