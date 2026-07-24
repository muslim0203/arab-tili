import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Clock, ListChecks, Crown, Lock, AlertCircle, GraduationCap } from "lucide-react";
import { AppLayout } from "@/components/app/AppLayout";
import { Badge } from "@/components/app/Badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/EmptyState";
import { SarfTheoryBlocks } from "@/components/sarf/SarfTheoryBlocks";
import { SarfQuiz } from "@/components/sarf/SarfQuiz";
import { api, ApiError } from "@/lib/api";
import type { SarfCompleteResponse, SarfLessonDetailResponse } from "@/lib/sarf-types";

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
      <div className="space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

/** Pro talab qiladigan (403) dars uchun yuklama karta. */
function UpgradeCard() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <Lock className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Bu dars Pro tarifda</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        To'liq sarf platformasi — barcha fe'l tuslanishlari, mashqlar va tushuntirishlar — Pro obuna bilan ochiladi.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild className="rounded-xl gap-2 bg-amber-600 text-white hover:bg-amber-700">
          <Link to="/pricing">
            <Crown className="h-4 w-4" />
            Pro tarifni ko'rish
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/sarf">Darslar ro'yxati</Link>
        </Button>
      </div>
    </div>
  );
}

export function SarfLesson() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["sarf", "lesson", slug],
    queryFn: () => api<SarfLessonDetailResponse>(`/sarf/lessons/${slug}`),
    enabled: !!slug,
    retry: (count, err) => {
      // 4xx (topilmadi / ruxsat yo'q) da qayta urinmaymiz.
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
      return count < 2;
    },
  });

  const complete = useMutation({
    mutationFn: (answers: number[]) =>
      api<SarfCompleteResponse>(`/sarf/lessons/${slug}/complete`, {
        method: "POST",
        body: { answers },
      }),
    onSuccess: (res) => {
      toast.success(
        `Dars yakunlandi! ${res.score}/${res.total} to'g'ri` +
          (res.bestScore > res.score ? ` (rekord: ${res.bestScore}/${res.total})` : "")
      );
      queryClient.invalidateQueries({ queryKey: ["sarf"] });
      navigate("/sarf");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Bu dars Pro tarifda. Iltimos, obunani yangilang.");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Saqlab bo'lmadi");
    },
  });

  // ── Holatlar ───────────────────────────────────────────────
  const isForbidden = error instanceof ApiError && error.status === 403;
  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <AppLayout>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="rounded-lg gap-2 -ml-2">
          <Link to="/sarf">
            <ArrowLeft className="h-4 w-4" />
            Darslar
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <DetailSkeleton />
      ) : isForbidden ? (
        <UpgradeCard />
      ) : isNotFound ? (
        <EmptyState
          icon={AlertCircle}
          title="Dars topilmadi"
          description="Bunday dars mavjud emas yoki hali nashr etilmagan."
          action={
            <Button asChild className="rounded-xl">
              <Link to="/sarf">Darslar ro'yxati</Link>
            </Button>
          }
        />
      ) : isError || !data ? (
        <EmptyState
          icon={AlertCircle}
          title="Darsni yuklab bo'lmadi"
          description={error instanceof Error ? error.message : "Noma'lum xato yuz berdi."}
        />
      ) : (
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Sarlavha */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge cefr={data.lesson.level}>{data.lesson.level}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {data.lesson.estMinutes} daq
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" />
                {data.lesson.questions.length} savol
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {data.lesson.titleUz}
            </h1>
            {data.lesson.titleAr && (
              <p className="mt-2 font-arabic text-2xl text-muted-foreground" dir="rtl">
                {data.lesson.titleAr}
              </p>
            )}
          </div>

          {/* Nazariya */}
          <SarfTheoryBlocks blocks={data.lesson.theory} tables={data.lesson.conjugationTables} />

          {/* Ajratgich + mashq */}
          {data.lesson.questions.length > 0 && (
            <div className="space-y-4 border-t border-border pt-8">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground sm:text-xl">Mashq</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Har savolga javob bering — darhol izoh ko'rsatiladi. Oxirida natijangiz saqlanadi.
              </p>
              <SarfQuiz
                questions={data.lesson.questions}
                onComplete={(answers) => complete.mutate(answers)}
                isSubmitting={complete.isPending}
              />
            </div>
          )}
        </motion.div>
      )}
    </AppLayout>
  );
}
