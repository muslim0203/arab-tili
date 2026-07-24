import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpenText, Sparkles, Crown, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/app/AppLayout";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { SarfLessonCard } from "@/components/sarf/SarfLessonCard";
import { api } from "@/lib/api";
import { useAccessControl } from "@/lib/useAccessControl";
import { useQuery } from "@tanstack/react-query";
import type { SarfLessonsResponse } from "@/lib/sarf-types";

function LessonSkeleton() {
  return (
    <div className="h-52 animate-pulse rounded-xl border border-border bg-card p-5">
      <div className="flex justify-between">
        <div className="h-5 w-12 rounded bg-muted" />
        <div className="h-5 w-16 rounded bg-muted" />
      </div>
      <div className="mt-4 h-5 w-3/4 rounded bg-muted" />
      <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
      <div className="mt-4 h-4 w-full rounded bg-muted" />
    </div>
  );
}

export function Sarf() {
  const { isProUser } = useAccessControl();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["sarf", "lessons"],
    queryFn: () => api<SarfLessonsResponse>("/sarf/lessons"),
  });

  const lessons = useMemo(
    () => [...(data?.lessons ?? [])].sort((a, b) => a.order - b.order),
    [data]
  );

  return (
    <AppLayout maxWidth="max-w-6xl">
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Sarf asoslari"
          subtitle="Arab tili morfologiyasi — sahih fe'l tuslanishi bo'yicha poydevor darslar."
          action={
            !isProUser ? (
              <Button asChild variant="outline" size="sm" className="rounded-xl gap-2">
                <Link to="/pricing">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Pro ochish
                </Link>
              </Button>
            ) : undefined
          }
        />

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <LessonSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={AlertCircle}
            title="Darslarni yuklab bo'lmadi"
            description={error instanceof Error ? error.message : "Noma'lum xato yuz berdi."}
          />
        ) : lessons.length === 0 ? (
          <EmptyState
            icon={BookOpenText}
            title="Hozircha darslar yo'q"
            description="Sarf darslari tez orada qo'shiladi. Keyinroq qayta tekshiring."
          />
        ) : (
          <>
            {!isProUser && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Bepul darslar hamma uchun ochiq. To'liq sarf platformasi (qulflangan darslar) Pro tarifda mavjud.
                </p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lessons.map((lesson) => (
                <SarfLessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          </>
        )}
      </motion.div>
    </AppLayout>
  );
}
