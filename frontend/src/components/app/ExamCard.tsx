import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ExamCardProps {
  id: string;
  title: string;
  description?: string | null;
  meta?: string;
  badge?: React.ReactNode;
  href: string;
  ctaLabel?: string;
  className?: string;
}

function ExamCard({ title, description, meta, badge, href, ctaLabel = "Boshlash", className }: ExamCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/20 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{title}</h3>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
          {meta && (
            <p className="mt-2 text-xs text-muted-foreground">{meta}</p>
          )}
        </div>
        <Button asChild size="sm" className="shrink-0 rounded-lg w-full sm:w-auto">
          <Link to={href}>{ctaLabel}</Link>
        </Button>
      </div>
    </motion.article>
  );
}

export { ExamCard };
