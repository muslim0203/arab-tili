import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/app/AppLayout";
import { PageHeader } from "@/components/app/PageHeader";
import { ExamCard } from "@/components/app/ExamCard";
import { EmptyState } from "@/components/app/EmptyState";
import { Badge } from "@/components/app/Badge";
import { api } from "@/lib/api";
import { Loader2, FileQuestion } from "lucide-react";

type ExamItem = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  examType: { id: string; name: string };
  useAiGeneration: boolean;
  questionCount: number;
};

export function ExamList() {
  const { data: exams, isLoading, error } = useQuery({
    queryKey: ["exams"],
    queryFn: () => api<ExamItem[]>("/exams"),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          {error instanceof Error ? error.message : "Imtihonlar yuklanmadi"}
        </div>
      </AppLayout>
    );
  }

  const list = exams ?? [];

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        <PageHeader
          title="Mock imtihonlar"
          subtitle="Darajangizni tanlang va imtihonni boshlang"
        />

        {list.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title="Imtihonlar topilmadi"
            description="Keyinroq qayta urinib ko‘ring."
            action={
              <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">
                Dashboardga qaytish
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((exam) => (
              <ExamCard
                key={exam.id}
                id={exam.id}
                title={exam.title}
                description={exam.description ?? exam.examType.name}
                meta={
                  exam.id === "cefr-full"
                    ? `5 bo'lim (daraja tanlang) · ${exam.durationMinutes} daqiqa`
                    : `${exam.questionCount} ta savol · ${exam.durationMinutes} daqiqa`
                }
                badge={exam.useAiGeneration ? <Badge variant="primary" className="ml-1">AI</Badge> : null}
                href={`/exam/start/${exam.id}`}
                ctaLabel="Boshlash"
              />
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
