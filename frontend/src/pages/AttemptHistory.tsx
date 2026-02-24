import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/app/AppLayout";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Badge } from "@/components/app/Badge";
import { api } from "@/lib/api";
import {
  Loader2,
  Award,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Minus,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Target,
  TrendingUp,
  BookOpen,
  Headphones,
  Pen,
  Mic,
  Languages,
  CalendarDays,
  Timer,
  Filter,
} from "lucide-react";
import { useState, useMemo } from "react";

/* ====== Types ====== */
type SectionScore = { score: number; max: number };

type AttemptItem = {
  id: string;
  status: string;
  level: string | null;
  totalScore: number | null;
  maxPossibleScore: number | null;
  percentage: number | null;
  cefrLevelAchieved: string | null;
  sectionScores: Record<string, SectionScore> | null;
  startedAt: string;
  completedAt: string | null;
  examTitle: string | null;
  examDurationMinutes: number | null;
  actualDurationMinutes: number | null;
  questionsCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
};

type AttemptsResponse = {
  items: AttemptItem[];
  nextCursor: string | null;
};

/* ====== Constants ====== */
const SECTION_TO_SKILL: Record<string, string> = {
  language_use: "grammar",
  grammar: "grammar",
  reading: "reading",
  listening: "listening",
  writing: "writing",
  speaking: "speaking",
};

const SKILL_META: Record<string, { label: string; icon: typeof BookOpen; color: string; bg: string }> = {
  grammar: { label: "Grammatika", icon: Languages, color: "text-violet-500", bg: "bg-violet-500" },
  reading: { label: "Reading", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500" },
  listening: { label: "Listening", icon: Headphones, color: "text-emerald-500", bg: "bg-emerald-500" },
  writing: { label: "Writing", icon: Pen, color: "text-orange-500", bg: "bg-orange-500" },
  speaking: { label: "Speaking", icon: Mic, color: "text-pink-500", bg: "bg-pink-500" },
};

type FilterType = "all" | "COMPLETED" | "IN_PROGRESS";

/* ====== Helper Functions ====== */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} daq`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} soat`;
  return `${h}s ${m}daq`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return `Bugun, ${d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffDays === 1) {
    return `Kecha, ${d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffDays < 7) {
    return `${diffDays} kun oldin`;
  }
  return d.toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScoreColor(pct: number): string {
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-blue-600 dark:text-blue-400";
  if (pct >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function getScoreBg(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-blue-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function buildSkillBreakdown(
  sectionScores: Record<string, SectionScore> | null
): Array<{ skill: string; score: number; max: number }> {
  if (!sectionScores) return [];
  const map: Record<string, { score: number; max: number }> = {};
  for (const [section, val] of Object.entries(sectionScores)) {
    const skill = SECTION_TO_SKILL[section] ?? section;
    if (!map[skill]) map[skill] = { score: 0, max: 0 };
    map[skill].score += val.score;
    map[skill].max += val.max;
  }
  const order = ["grammar", "reading", "listening", "writing", "speaking"];
  return order
    .filter((s) => map[s])
    .map((s) => ({ skill: s, score: Math.round(map[s].score), max: map[s].max }));
}

/* ====== Circular Progress Component ====== */
function CircularProgress({
  percentage,
  size = 64,
  strokeWidth = 5,
  className,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className={className}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-muted"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={`${getScoreBg(percentage).replace("bg-", "stroke-")}`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.3em"
        className={`text-xs font-bold fill-current ${getScoreColor(percentage)}`}
      >
        {percentage.toFixed(0)}%
      </text>
    </svg>
  );
}

/* ====== Skill Mini Bar ====== */
function SkillMiniBar({ skill, score, max }: { skill: string; score: number; max: number }) {
  const meta = SKILL_META[skill];
  const Icon = meta?.icon ?? BookOpen;
  const pct = max > 0 ? (score / max) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${meta?.color ?? "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${meta?.bg ?? "bg-primary"}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, delay: 0.1 }}
          />
        </div>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground tabular-nums shrink-0">
        {score}/{max}
      </span>
    </div>
  );
}

/* ====== Attempt Card Component ====== */
function AttemptCard({ item, index }: { item: AttemptItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = item.status === "COMPLETED";
  const pct = item.percentage ?? 0;
  const skills = buildSkillBreakdown(item.sectionScores);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card className="rounded-xl border-border shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
        {/* Main row */}
        <div
          className="flex items-center gap-4 p-4 cursor-pointer"
          onClick={() => isCompleted && setExpanded(!expanded)}
          role={isCompleted ? "button" : undefined}
          tabIndex={isCompleted ? 0 : undefined}
        >
          {/* Score circle */}
          {isCompleted ? (
            <CircularProgress percentage={pct} size={56} strokeWidth={4} />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-950">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">
                {item.examTitle ?? `CEFR ${item.level ?? ""}`}
              </h3>
              {item.cefrLevelAchieved && (
                <Badge cefr={item.cefrLevelAchieved} className="gap-0.5">
                  <Award className="h-3 w-3" />
                  {item.cefrLevelAchieved}
                </Badge>
              )}
              {!isCompleted && (
                <Badge variant="warning" className="gap-0.5">
                  <Clock className="h-3 w-3" />
                  Davom etmoqda
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDate(item.startedAt)}
              </span>
              {isCompleted && item.totalScore != null && (
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {item.totalScore}/{item.maxPossibleScore} ball
                </span>
              )}
              {item.actualDurationMinutes != null && (
                <span className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {formatDuration(item.actualDurationMinutes)}
                </span>
              )}
              {item.questionsCount > 0 && (
                <span className="flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" />
                  {item.questionsCount} savol
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isCompleted ? (
              <>
                <Button variant="ghost" size="sm" asChild className="rounded-lg text-xs h-8 px-3">
                  <Link to={`/attempts/${item.id}/results`}>
                    <BarChart3 className="h-3.5 w-3.5 mr-1" />
                    Natija
                  </Link>
                </Button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  title="Batafsil"
                >
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </>
            ) : (
              <Button variant="default" size="sm" asChild className="rounded-lg text-xs h-8 px-3">
                <Link to={`/exam/${item.id}`}>Davom etish</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && isCompleted && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-4">
                {/* Correct / Wrong / Unanswered stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {item.correctCount}
                      </p>
                      <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">To'g'ri</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {item.wrongCount}
                      </p>
                      <p className="text-[10px] text-red-600/80 dark:text-red-400/80">Noto'g'ri</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2">
                    <Minus className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-lg font-bold text-slate-600 dark:text-slate-400">
                        {item.unansweredCount}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500">Javobsiz</p>
                    </div>
                  </div>
                </div>

                {/* Section scores */}
                {skills.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Ko'nikmalar bo'yicha</p>
                    <div className="space-y-2">
                      {skills.map((sk) => (
                        <SkillMiniBar key={sk.skill} {...sk} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Exam duration info */}
                {(item.examDurationMinutes || item.actualDurationMinutes) && (
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {item.examDurationMinutes && (
                      <span>
                        Ajratilgan vaqt: <strong>{formatDuration(item.examDurationMinutes)}</strong>
                      </span>
                    )}
                    {item.actualDurationMinutes != null && (
                      <span>
                        Sarflangan vaqt: <strong>{formatDuration(item.actualDurationMinutes)}</strong>
                      </span>
                    )}
                    {item.examDurationMinutes && item.actualDurationMinutes != null && (
                      <span>
                        {item.actualDurationMinutes <= item.examDurationMinutes ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ✓ Vaqtida tugatildi ({formatDuration(item.examDurationMinutes - item.actualDurationMinutes)} ortiqcha)
                          </span>
                        ) : (
                          <span className="text-red-500">
                            Vaqtdan oshib ketdi (+{formatDuration(item.actualDurationMinutes - item.examDurationMinutes)})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

/* ====== Summary Stats ====== */
function SummaryStats({ items }: { items: AttemptItem[] }) {
  const completed = items.filter((a) => a.status === "COMPLETED");
  if (completed.length === 0) return null;

  const totalExams = completed.length;
  const avgScore = completed.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / totalExams;
  const bestScore = Math.max(...completed.map((a) => a.percentage ?? 0));
  const lastCefr = completed[0]?.cefrLevelAchieved;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "Jami imtihonlar", value: totalExams.toString(), icon: ClipboardList, color: "text-primary" },
        { label: "O'rtacha ball", value: `${avgScore.toFixed(0)}%`, icon: Target, color: getScoreColor(avgScore) },
        { label: "Eng yuqori ball", value: `${bestScore.toFixed(0)}%`, icon: TrendingUp, color: "text-emerald-500" },
        { label: "Hozirgi CEFR", value: lastCefr ?? "—", icon: Award, color: "text-amber-500" },
      ].map((stat) => (
        <Card key={stat.label} className="rounded-xl border-border shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ====== Main Component ====== */
export function AttemptHistory() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["attempts", "history", cursor],
    queryFn: () =>
      api<AttemptsResponse>(
        cursor ? `/attempts?limit=20&cursor=${encodeURIComponent(cursor)}` : "/attempts?limit=20"
      ),
  });

  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((a) => a.status === filter);
  }, [items, filter]);

  const completedCount = items.filter((a) => a.status === "COMPLETED").length;
  const inProgressCount = items.filter((a) => a.status === "IN_PROGRESS").length;

  if (isLoading && !data) {
    return (
      <AppLayout maxWidth="max-w-4xl">
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout maxWidth="max-w-4xl">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          {error instanceof Error ? error.message : "Xatolik"}
        </div>
        <Button variant="outline" asChild className="mt-4 rounded-xl">
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      </AppLayout>
    );
  }

  return (
    <AppLayout maxWidth="max-w-4xl">
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Imtihonlar tarixi"
          subtitle="Barcha topshirilgan imtihonlar, natijalar va batafsil statistikalar"
        />

        {items.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Hali imtihon topshirmagansiz"
            description="Mock imtihonni boshlang va natijalaringizni shu yerda ko'ring."
            action={
              <Button asChild className="rounded-xl">
                <Link to="/exams">Mock imtihonni boshlash</Link>
              </Button>
            }
          />
        ) : (
          <>
            {/* Summary Stats */}
            <SummaryStats items={items} />

            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {[
                { key: "all" as FilterType, label: "Barchasi", count: items.length },
                { key: "COMPLETED" as FilterType, label: "Tugatilgan", count: completedCount },
                { key: "IN_PROGRESS" as FilterType, label: "Jarayonda", count: inProgressCount },
              ]
                .filter((f) => f.count > 0 || f.key === "all")
                .map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
            </div>

            {/* Attempts list */}
            <div className="space-y-3">
              {filteredItems.map((a, i) => (
                <AttemptCard key={a.id} item={a} index={i} />
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                <p>Bu filtrdagi imtihonlar topilmadi.</p>
              </div>
            )}

            {nextCursor && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCursor(nextCursor)}
                  disabled={isLoading}
                  className="min-h-11 rounded-xl"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Yana yuklash"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </AppLayout>
  );
}
