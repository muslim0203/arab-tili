import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/app/AppLayout";
import { Badge } from "@/components/app/Badge";
import { api } from "@/lib/api";
import { Loader2, CheckCircle2, XCircle, BookOpen, Headphones, Pen, Mic, Languages } from "lucide-react";

/* ====== Scoring Constants (mirror of backend cefr-scoring.ts) ====== */
const MAX_PER_SKILL = 30;
const MAX_TOTAL = 150;

const SKILL_META: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
  grammar: { label: "Grammatika", icon: Languages, color: "text-violet-500" },
  reading: { label: "Reading", icon: BookOpen, color: "text-blue-500" },
  listening: { label: "Listening", icon: Headphones, color: "text-emerald-500" },
  writing: { label: "Writing", icon: Pen, color: "text-orange-500" },
  speaking: { label: "Speaking", icon: Mic, color: "text-pink-500" },
};

const SECTION_TO_SKILL: Record<string, string> = {
  language_use: "grammar",
  grammar: "grammar",
  reading: "reading",
  listening: "listening",
  writing: "writing",
  speaking: "speaking",
};

const CEFR_RANGES = [
  { level: "A1", min: 0, max: 24, label: "Boshlang'ich" },
  { level: "A2", min: 25, max: 49, label: "Asosiy" },
  { level: "B1", min: 50, max: 74, label: "Mustaqil" },
  { level: "B2", min: 75, max: 99, label: "Yuqori O'rta" },
  { level: "C1", min: 100, max: 124, label: "Ilg'or" },
  { level: "C2", min: 125, max: 150, label: "Yuqori Malaka" },
];

/* ====== Types ====== */
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

/* ====== Component ====== */
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
  const max = data.maxPossibleScore ?? MAX_TOTAL;
  const pct = max > 0 ? (total / max) * 100 : 0;
  const cefr = data.cefrLevelAchieved ?? "—";
  const cefrInfo = CEFR_RANGES.find((r) => r.level === cefr);

  // Skill breakdown from sectionScores
  const skillBreakdown = buildSkillBreakdown(data.sectionScores);

  return (
    <AppLayout maxWidth="max-w-2xl">
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* === Umumiy natija === */}
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
            {/* Ball va CEFR */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Jami ball</p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {total} <span className="text-lg font-normal text-muted-foreground">/ {max}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{pct.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">CEFR darajasi</p>
                <div className="mt-2">
                  <Badge cefr={cefr !== "—" ? cefr : undefined} className="text-lg px-4 py-1.5">
                    {cefr}
                  </Badge>
                  {cefrInfo && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {cefrInfo.label} ({cefrInfo.min}–{cefrInfo.max} ball)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Feedback */}
            {data.cefrFeedback && (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="mb-1 text-sm font-medium text-muted-foreground">AI bahosi</p>
                <p className="text-sm">{data.cefrFeedback}</p>
              </div>
            )}

            {/* CEFR Jadval */}
            <div className="rounded-xl border border-border bg-muted/10 p-4">
              <p className="mb-3 text-sm font-medium text-muted-foreground">CEFR baholash jadvali</p>
              <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
                {CEFR_RANGES.map((r) => (
                  <div
                    key={r.level}
                    className={`rounded-lg border p-2 text-center ${cefr === r.level ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border text-muted-foreground"}`}
                  >
                    <p className="text-base font-bold">{r.level}</p>
                    <p>{r.min}–{r.max}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* === Skill bo'yicha breakdown === */}
        {skillBreakdown.length > 0 && (
          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Ko'nikmalar bo'yicha natija</CardTitle>
              <CardDescription>Har bir ko'nikma uchun max {MAX_PER_SKILL} ball</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skillBreakdown.map((sk) => {
                  const meta = SKILL_META[sk.skill];
                  const Icon = meta?.icon ?? BookOpen;
                  const pctSk = sk.max > 0 ? (sk.score / sk.max) * 100 : 0;
                  return (
                    <div key={sk.skill}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${meta?.color ?? "text-muted-foreground"}`} />
                          <span className="text-sm font-medium">{meta?.label ?? sk.skill}</span>
                        </div>
                        <span className="text-sm font-semibold">
                          {sk.score} / {sk.max}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${pctSk}%` }}
                          transition={{ duration: 0.6, delay: 0.15 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* === Savollar === */}
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
              const sectionLabel = q.section
                ? (SKILL_META[SECTION_TO_SKILL[q.section] ?? q.section]?.label ?? q.section)
                : undefined;
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
                          {sectionLabel && (
                            <p className="text-xs text-muted-foreground">{sectionLabel}</p>
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
            <Link to="/attempts/history">Tarix</Link>
          </Button>
          <Button variant="ghost" asChild size="default" className="rounded-xl">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </motion.div>
    </AppLayout>
  );
}

/** sectionScores'dan skill'ga mapping */
function buildSkillBreakdown(
  sectionScores: Record<string, { score: number; max: number }> | null
): Array<{ skill: string; score: number; max: number }> {
  if (!sectionScores) return [];

  const map: Record<string, { score: number; max: number }> = {};
  for (const [section, val] of Object.entries(sectionScores)) {
    const skill = SECTION_TO_SKILL[section] ?? section;
    if (!map[skill]) map[skill] = { score: 0, max: 0 };
    map[skill].score += val.score;
    map[skill].max += val.max;
  }

  // Tartib: grammar, reading, listening, speaking, writing
  const order = ["grammar", "reading", "listening", "speaking", "writing"];
  return order
    .filter((s) => map[s])
    .map((s) => ({ skill: s, score: Math.round(map[s].score), max: map[s].max }));
}
