import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Clock, CheckCircle2, ListChecks, ArrowRight } from "lucide-react";
import { Badge } from "@/components/app/Badge";
import { cn } from "@/lib/utils";
import type { SarfLessonListItem } from "@/lib/sarf-types";

interface SarfLessonCardProps {
  lesson: SarfLessonListItem;
}

export function SarfLessonCard({ lesson }: SarfLessonCardProps) {
  const { slug, level, titleUz, titleAr, summary, estMinutes, questionCount, hasAccess, isFree, progress } = lesson;
  const completed = progress.status === "completed";
  const inProgress = progress.status === "in_progress";
  const href = hasAccess ? `/sarf/${slug}` : "/pricing";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        to={href}
        className={cn(
          "group flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all",
          "hover:border-primary/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          !hasAccess && "opacity-95"
        )}
      >
        {/* Yuqori qator: level + holat */}
        <div className="flex items-center justify-between gap-2">
          <Badge cefr={level}>{level}</Badge>
          <div className="flex items-center gap-1.5">
            {completed && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {progress.bestScore}/{questionCount}
              </span>
            )}
            {!completed && inProgress && (
              <Badge variant="warning">Davom etilmoqda</Badge>
            )}
            {!hasAccess && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Lock className="h-3.5 w-3.5" />
                Pro
              </span>
            )}
            {hasAccess && isFree && !completed && !inProgress && (
              <Badge variant="success">Bepul</Badge>
            )}
          </div>
        </div>

        {/* Sarlavhalar */}
        <div className="mt-3 flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary">{titleUz}</h3>
          {titleAr && (
            <p className="mt-1 font-arabic text-lg text-muted-foreground" dir="rtl">
              {titleAr}
            </p>
          )}
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{summary}</p>
        </div>

        {/* Pastki meta qatori */}
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {estMinutes} daq
            </span>
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5" />
              {questionCount} savol
            </span>
          </div>
          {hasAccess ? (
            <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
          ) : (
            <span className="font-medium text-amber-600 dark:text-amber-400">Pro talab qilinadi</span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
