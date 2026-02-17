import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

function PageHeader({ title, subtitle, action, className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between", className)}
      {...props}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="mt-3 sm:mt-0">{action}</div>}
    </div>
  );
}

export { PageHeader };
