import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/app/AppLayout";
import { PageHeader } from "@/components/app/PageHeader";
import { StatsCard } from "@/components/app/StatsCard";
import { EmptyState } from "@/components/app/EmptyState";
import { Badge } from "@/components/app/Badge";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import {
  Loader2,
  ClipboardList,
  Shield,
  Target,
  Clock,
  Zap,
} from "lucide-react";

type Progress = {
  totalExamsTaken: number;
  currentCefrEstimate: string | null;
  currentStreakDays: number;
  lastActivityAt: string | null;
};

type DashboardStats = {
  examsTaken: number;
  examsThisMonth: number;
  examsThisMonthDiff: number;
  averageScore: number;
  scoreGrowth: number;
  totalStudyMinutes: number;
  studyMinutesThisWeek: number;
  last7DaysData: { day: string; ball: number }[];
  skillScores: Record<string, number> | null;
  aiCredits: number;
  aiCreditsRefreshDays: number;
};

type AttemptItem = {
  id: string;
  status: string;
  level: string | null;
  totalScore: number | null;
  maxPossibleScore: number | null;
  percentage: number | null;
  cefrLevelAchieved: string | null;
  startedAt: string;
  completedAt: string | null;
  examTitle: string | null;
};

const SKILL_LABELS: Record<string, string> = {
  reading: "Reading",
  writing: "Writing",
  listening: "Listening",
  speaking: "Speaking",
  language_use: "Grammar",
};

function formatStudyTime(minutes: number): string {
  if (minutes < 60) return `${minutes} daq`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (m === 0) return `${h}s`;
  return `${h}s ${m}daq`;
}

export function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["progress"],
    queryFn: () => api<Progress>("/progress"),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["progress", "stats"],
    queryFn: () => api<DashboardStats>("/progress/stats"),
  });

  const { data: attemptsData } = useQuery({
    queryKey: ["attempts", "recent"],
    queryFn: () => api<{ items: AttemptItem[]; nextCursor: string | null }>("/attempts?limit=5"),
  });

  const recentAttempts = attemptsData?.items ?? [];

  const radarData =
    stats?.skillScores && Object.keys(stats.skillScores).length > 0
      ? Object.entries(stats.skillScores).map(([key, val]) => ({
          skill: SKILL_LABELS[key] ?? key,
          ball: Math.round(Number(val) ?? 0),
          fullMark: 100,
        }))
      : [
          { skill: "Reading", ball: 0, fullMark: 100 },
          { skill: "Writing", ball: 0, fullMark: 100 },
          { skill: "Listening", ball: 0, fullMark: 100 },
          { skill: "Speaking", ball: 0, fullMark: 100 },
          { skill: "Grammar", ball: 0, fullMark: 100 },
        ];

  const isLoading = progressLoading || statsLoading;

  return (
    <AppLayout>
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="rounded-xl border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">
              Xush kelibsiz, {user?.fullName?.split(" ")[0] ?? "foydalanuvchi"}!
            </CardTitle>
            <CardDescription className="space-y-1">
              <span className="block">Arab tili imtihoniga tayyorgarlik – mock imtihonlar, AI tutor va progress.</span>
              <span className="block mt-2 text-muted-foreground">
                Sizning hozirgi CEFR darajangiz:{" "}
                <span className="font-semibold text-emerald-600">
                  {progress?.currentCefrEstimate ?? "—"}
                </span>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button asChild size="default" className="rounded-xl shadow-sm">
                <Link to="/exams">Mock imtihonlar</Link>
              </Button>
              <Button variant="secondary" asChild size="default" className="rounded-xl">
                <Link to="/ai-tutor">AI Tutor</Link>
              </Button>
              <Button variant="outline" asChild size="default" className="rounded-xl">
                <Link to="/pricing">Tariflar</Link>
              </Button>
              <Button variant="ghost" asChild size="default" className="rounded-xl">
                <Link to="/attempts/history">Imtihonlar tarixi</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Joriy tarif: <strong>{user?.subscriptionTier ?? "FREE"}</strong>
              {user?.subscriptionExpiresAt && (
                <span className="ml-1">
                  (tugashi: {new Date(user.subscriptionExpiresAt).toLocaleDateString("uz-UZ")})
                </span>
              )}
              {" · "}
              AI orqali generatsiya qilinadigan imtihonlar va CEFR baholash mavjud.
            </p>
          </CardContent>
        </Card>

        <section>
          <PageHeader
            title="Statistika"
            subtitle="Sizning o'quv natijalaringiz"
          />
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-8 justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Yuklanmoqda…</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatsCard
                label="Olingan imtihonlar"
                value={stats?.examsTaken ?? 0}
                subtitle={
                  (stats?.examsThisMonthDiff ?? 0) !== 0
                    ? `${stats && stats.examsThisMonthDiff > 0 ? "+" : ""}${stats?.examsThisMonthDiff ?? 0} bu oy`
                    : undefined
                }
                icon={Shield}
                iconVariant="primary"
              />
              <StatsCard
                label="O'rtacha ball"
                value={stats?.averageScore ? `${stats.averageScore}%` : "0%"}
                subtitle={
                  (stats?.scoreGrowth ?? 0) !== 0
                    ? `${stats && stats.scoreGrowth > 0 ? "+" : ""}${stats?.scoreGrowth ?? 0}% o'sish`
                    : undefined
                }
                icon={Target}
                iconVariant="primary"
              />
              <StatsCard
                label="O'quv vaqti"
                value={formatStudyTime(stats?.totalStudyMinutes ?? 0)}
                subtitle={
                  stats?.studyMinutesThisWeek
                    ? `${formatStudyTime(stats.studyMinutesThisWeek)} bu hafta`
                    : undefined
                }
                icon={Clock}
                iconVariant="muted"
              />
              <StatsCard
                label="AI kreditlar"
                value={stats?.aiCredits ?? 0}
                subtitle={
                  stats?.aiCreditsRefreshDays
                    ? `${stats.aiCreditsRefreshDays} kunda yangilanadi`
                    : undefined
                }
                icon={Zap}
                iconVariant="amber"
              />
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-xl border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ko'rsatkichlar tahlili</CardTitle>
              <CardDescription>So'nggi 7 kundagi natijalar o'zgarishi</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.last7DaysData ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8 }}
                    formatter={(v: number | undefined) => [v != null ? `${v}%` : "—", "Ball"]}
                    labelFormatter={(label) => `Kun: ${label}`}
                  />
                  <Area type="monotone" dataKey="ball" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorBall)" />
                </AreaChart>
              </ResponsiveContainer>
              {stats?.last7DaysData && stats.last7DaysData.length > 0 && (
                <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Progress
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ko'nikmalar radari</CardTitle>
              <CardDescription>Sizning kuchli va kuchsiz tomonlaringiz</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Ball"
                    dataKey="ball"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <PageHeader title="So'nggi imtihonlar" />
            <Button variant="ghost" size="sm" asChild className="rounded-lg shrink-0">
              <Link to="/attempts/history">Barchasi</Link>
            </Button>
          </div>
          {recentAttempts.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Hali imtihon topshirmagansiz"
              description="Mock imtihonlardan birini boshlang va CEFR darajangizni bilib oling."
              action={
                <Button asChild className="rounded-xl">
                  <Link to="/exams">Mock imtihonni boshlash</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {recentAttempts.map((a) => (
                <li key={a.id}>
                  <Link
                    to={a.status === "COMPLETED" ? `/attempts/${a.id}/results` : `/exam/${a.id}`}
                    className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {a.examTitle ?? `Imtihon ${a.id.slice(0, 8)}`}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {a.status === "COMPLETED" ? (
                          <>
                            {a.percentage != null && `${a.percentage.toFixed(0)}% · `}
                            {a.cefrLevelAchieved && (
                              <Badge cefr={a.cefrLevelAchieved}>
                                {a.cefrLevelAchieved}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-amber-600">Davom etmoqda</span>
                        )}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </motion.div>
    </AppLayout>
  );
}
