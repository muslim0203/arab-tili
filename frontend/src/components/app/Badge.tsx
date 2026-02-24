import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  destructive: "bg-red-500/15 text-red-700 dark:text-red-400",
  cefr: {
    A1: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    A2: "bg-slate-600/15 text-slate-800 dark:text-slate-200",
    B1: "bg-blue-600/15 text-blue-700 dark:text-blue-300",
    B2: "bg-blue-700/15 text-blue-800 dark:text-blue-200",
    C1: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300",
    C2: "bg-emerald-700/15 text-emerald-800 dark:text-emerald-200",
  },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof Omit<typeof variants, "cefr">;
  cefr?: keyof typeof variants.cefr | string;
}

function Badge({ className, variant = "default", cefr, ...props }: BadgeProps) {
  const cefrStyle = cefr && cefr in variants.cefr ? variants.cefr[cefr as keyof typeof variants.cefr] : variants.cefr.B1;
  const style = cefr ? cefrStyle : variants[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        style,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
