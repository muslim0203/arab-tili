import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export type StatsCardIconVariant = "primary" | "muted" | "amber";

export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  iconVariant?: StatsCardIconVariant;
}

const iconVariantClasses: Record<StatsCardIconVariant, string> = {
  primary: "bg-emerald-500/15 text-emerald-600",
  muted: "bg-muted text-muted-foreground",
  amber: "bg-amber-500/15 text-amber-600",
};

function StatsCard({ label, value, subtitle, icon: Icon, iconVariant = "primary", className }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md relative",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-lg",
            iconVariantClasses[iconVariant]
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      )}
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {subtitle != null && (
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{subtitle}</p>
      )}
    </motion.div>
  );
}

export { StatsCard };
