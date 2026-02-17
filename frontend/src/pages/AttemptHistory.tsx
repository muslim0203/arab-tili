import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/app/AppLayout";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Badge } from "@/components/app/Badge";
import { api } from "@/lib/api";
import { Loader2, Award, ClipboardList } from "lucide-react";
import { useState } from "react";

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

type AttemptsResponse = {
  items: AttemptItem[];
  nextCursor: string | null;
};

export function AttemptHistory() {
  const [cursor, setCursor] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["attempts", "history", cursor],
    queryFn: () =>
      api<AttemptsResponse>(
        cursor ? `/attempts?limit=20&cursor=${encodeURIComponent(cursor)}` : "/attempts?limit=20"
      ),
  });

  if (isLoading && !data) {
    return (
      <AppLayout maxWidth="max-w-2xl">
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout maxWidth="max-w-2xl">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          {error instanceof Error ? error.message : "Xatolik"}
        </div>
        <Button variant="outline" asChild className="mt-4 rounded-xl">
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      </AppLayout>
    );
  }

  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;

  return (
    <AppLayout maxWidth="max-w-2xl">
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Imtihonlar tarixi"
          subtitle="Barcha topshirilgan imtihonlar va natijalar"
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
            <ul className="space-y-3">
              {items.map((a, i) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to={a.status === "COMPLETED" ? `/attempts/${a.id}/results` : `/exam/${a.id}`}
                    className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {a.examTitle ?? `CEFR ${a.level ?? ""}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.startedAt).toLocaleString("uz-UZ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.status === "COMPLETED" ? (
                          <>
                            {a.percentage != null && (
                              <span className="text-sm font-medium">{a.percentage.toFixed(0)}%</span>
                            )}
                            {a.cefrLevelAchieved && (
                              <Badge cefr={a.cefrLevelAchieved} className="gap-1">
                                <Award className="h-3 w-3" />
                                {a.cefrLevelAchieved}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-sm font-medium text-amber-600">Davom etmoqda</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>

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
